import {
  type Board,
  type Color,
  opposite,
  parseSquare,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlanSentences } from '#page/review/i18n/types.ts';
import { type Fact, said } from './said.ts';

// What a quiet move does for the position when it wins or stops nothing: it
// develops a piece, takes an open file, settles on an outpost, makes or pushes
// a passed pawn, brings the king to the center of an endgame. Said of what
// the move does, never as the reason it's best.

export interface PlanInput {
  readonly move: MoveVerdict;
  readonly sentences: PlanSentences;
  readonly before: Board;
  readonly after: Board;
}

// The opening's moves, by ply, in which a minor piece's first move develops it.
const OPENING_PLIES = 30;
const BACK_SQUARES: Readonly<Record<Color, readonly string[]>> = {
  white: ['b1', 'c1', 'f1', 'g1'],
  black: ['b8', 'c8', 'f8', 'g8'],
};

/** The rank as seen from `color`'s side, 0 its own back rank. */
const ownRank = (square: Square, color: Color): number => {
  const rank = squareCoords(square)[1];
  return color === 'white' ? rank : 7 - rank;
};

/** The ranks of `color`'s pawns on `file`. */
function pawnsOn(board: Board, file: number, color: Color): number[] {
  const ranks: number[] = [];
  for (const [square, piece] of board) {
    const [pawnFile, rank] = squareCoords(square);
    if (piece.role === 'pawn' && piece.color === color && pawnFile === file) ranks.push(rank);
  }
  return ranks;
}

/** Whether the other side has a pawn on `files` ahead of `square`, from `color`'s side. */
function pawnAhead(board: Board, square: Square, color: Color, files: readonly number[]): boolean {
  const ahead = ownRank(square, color);
  return files.some(file =>
    pawnsOn(board, file, opposite(color)).some(rank => {
      const seen = squareAt(file, rank);
      return seen !== null && ownRank(seen, color) > ahead;
    }),
  );
}

function isPassed(board: Board, square: Square, color: Color): boolean {
  const file = squareCoords(square)[0];
  return !pawnAhead(board, square, color, [file - 1, file, file + 1]);
}

// A knight on the other side's half, held by a pawn, no pawn of theirs able to come at it.
function isOutpost(board: Board, square: Square, piece: Piece): boolean {
  const [file] = squareCoords(square);
  const rank = ownRank(square, piece.color);
  const back = piece.color === 'white' ? -1 : 1;
  const holders = [file - 1, file + 1].flatMap(side => {
    const holder = squareAt(side, squareCoords(square)[1] + back);
    return holder ? [board.get(holder)] : [];
  });
  const held = holders.some(holder => holder?.role === 'pawn' && holder.color === piece.color);
  return (
    rank >= 3 && rank <= 5 && held && !pawnAhead(board, square, piece.color, [file - 1, file + 1])
  );
}

const pieceCount = (board: Board): number =>
  [...board.values()].filter(piece => piece.role !== 'pawn' && piece.role !== 'king').length;

const centerDistance = (square: Square): number => {
  const [file, rank] = squareCoords(square);
  return Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));
};

function pieceFact({ move, sentences, after }: PlanInput, from: Square, to: Square): Fact | null {
  const piece = after.get(to);
  if (!piece) return null;
  const opening = move.ply <= OPENING_PLIES && BACK_SQUARES[piece.color].includes(from);
  if (opening && (piece.role === 'knight' || piece.role === 'bishop'))
    return said(sentences.develops(piece));
  if (piece.role === 'knight' && isOutpost(after, to, piece)) return said(sentences.outpost(piece));
  const [file] = squareCoords(to);
  if (piece.role === 'rook' && pawnsOn(after, file, piece.color).length === 0)
    return said(sentences.openFile(pawnsOn(after, file, opposite(piece.color)).length > 0));
  // An endgame: few pieces, the queens gone.
  const endgame =
    pieceCount(after) <= 6 && ![...after.values()].some(({ role }) => role === 'queen');
  if (piece.role === 'king' && endgame && centerDistance(to) < centerDistance(from))
    return said(sentences.centralKing);
  return null;
}

/** What the quiet move does for the position, if it's one of the plans the coach names. */
export function planFact(input: PlanInput): Fact | null {
  const { move, sentences, before, after } = input;
  const from = parseSquare(move.uci.slice(0, 2));
  const to = parseSquare(move.uci.slice(2, 4));
  if (!from || !to || /[x+]/.test(move.san)) return null;
  // With a mate on the board, the mate is the point, not the plan.
  if ('mate' in move.before || 'mate' in move.after) return null;
  const pawn = after.get(to);
  if (pawn?.role === 'pawn' && isPassed(after, to, pawn.color))
    return said(sentences.passedPawn(!isPassed(before, from, pawn.color)));
  return pieceFact(input, from, to);
}
