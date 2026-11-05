import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  opposite,
  parseSquare,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { decided } from './trajectory.ts';
import { isEndgame, OPENING_PLIES, ownRank, pawnsOn } from './structure.ts';

// What a move leaves of the pawns and the pieces: a pawn isolated or held
// back, a lead in development, a rook gone passive.

const pawnsOf = (board: Board, color: Color): Square[] =>
  [...board].flatMap(([square, piece]) =>
    piece.role === 'pawn' && piece.color === color ? [square] : [],
  );

/** A pawn with no pawn of its own on the files beside it. */
function isIsolated(board: Board, square: Square, color: Color): boolean {
  const [file] = squareCoords(square);
  return (
    pawnsOn(board, file - 1, color).length === 0 && pawnsOn(board, file + 1, color).length === 0
  );
}

/**
 * A pawn its neighbors have left behind: no enemy pawn in front of it on its
 * file, its own on the files beside all ahead of it, and its next square held
 * by an enemy pawn, so it can't come up to them.
 */
export function isBackward(board: Board, square: Square, color: Color): boolean {
  const [file, rank] = squareCoords(square);
  const stop = squareAt(file, rank + (color === 'white' ? 1 : -1));
  if (!stop || board.has(stop) || isIsolated(board, square, color)) return false;
  const own = ownRank(square, color);
  const ahead = (row: number) => {
    const at = squareAt(file, row);
    return at !== null && ownRank(at, color) > own;
  };
  const neighbors = [file - 1, file + 1].flatMap(side =>
    pawnsOn(board, side, color).map(row => squareAt(side, row)),
  );
  const left = neighbors.every(at => at !== null && ownRank(at, color) > own);
  const faced = pawnsOn(board, file, opposite(color)).some(ahead);
  return left && !faced && attackers(board, stop, opposite(color)).includes('pawn');
}

// The board once the engine's reply takes back on the capture's square, if it does.
function settledBoard({ move, after }: FactInput): Board {
  const reply = move.after.best;
  const retakes = move.san.includes('x') && reply?.slice(2, 4) === move.uci.slice(2, 4);
  return retakes && reply ? boardAfter(after, reply) : after;
}

/**
 * A pawn of `side`'s, alone on its file, that the move, taken back, leaves
 * isolated; before the endgame, where it can still be won as a target.
 */
export function isolatedFact(input: FactInput, side: Color): Fact | null {
  const { move, facts, before } = input;
  const settled = settledBoard(input);
  if (isEndgame(settled) || decided(move)) return null;
  const isolated = pawnsOf(settled, side).find(square => {
    const [file] = squareCoords(square);
    const alone = pawnsOn(settled, file, side).length === 1;
    const was = pawnsOf(before, side).some(
      at => squareCoords(at)[0] === file && isIsolated(before, at, side),
    );
    return alone && !was && isIsolated(settled, square, side);
  });
  return isolated ? said(oneOf(facts.isolatedPawn(side, squareToken(isolated)), move)) : null;
}

/** An error, a pawn's move, that leaves one of the mover's pawns backward. */
export function backwardFact({ move, facts, me, before, after }: FactInput): Fact | null {
  const from = parseSquare(move.uci.slice(0, 2));
  if (!from || before.get(from)?.role !== 'pawn' || move.san.includes('x')) return null;
  const left = pawnsOf(after, me).find(
    square =>
      isBackward(after, square, me) && !(before.has(square) && isBackward(before, square, me)),
  );
  return left ? said(oneOf(facts.backwardPawn(squareToken(left)), move)) : null;
}

// The minor pieces' squares at the start, and the plies in which development counts.
const HOMES: Readonly<Record<Color, readonly Square[]>> = {
  white: ['b1', 'c1', 'f1', 'g1'],
  black: ['b8', 'c8', 'f8', 'g8'],
};
const DEVELOPING_PLIES = 24;
const LEAD = 2;

// The minor pieces still on their first squares: a piece traded off is no
// longer behind, nor is castling one.
const atHome = (board: Board, color: Color): number =>
  HOMES[color].filter(square => {
    const piece = board.get(square);
    return piece?.color === color && (piece.role === 'knight' || piece.role === 'bishop');
  }).length;

/** An error in the opening that brings nothing out, by a side behind in development. */
export function developmentFact({ move, facts, me, them, before, after }: FactInput): Fact | null {
  if (move.position.ply > DEVELOPING_PLIES || move.san.includes('x') || move.san.startsWith('O-O'))
    return null;
  if (atHome(after, me) < atHome(before, me)) return null;
  const behind = atHome(after, me) - atHome(after, them);
  return behind >= LEAD ? said(oneOf(facts.behindInDevelopment(me, behind), move)) : null;
}

// The plies a queen move counts as out early, and the minor pieces still home then.
const QUEEN_EARLY_PLIES = 12;
const STILL_HOME = 2;

/** An error in the opening that brings the queen out, its minor pieces still at home. */
export function queenOutFact({ move, facts, me, before, after }: FactInput): Fact | null {
  const [from, to] = [parseSquare(move.uci.slice(0, 2)), parseSquare(move.uci.slice(2, 4))];
  if (!from || !to || before.get(from)?.role !== 'queen' || move.san.includes('x')) return null;
  // Qe2 stays home; the queen is out past its second rank.
  if (ownRank(to, me) < 2 || move.position.ply > QUEEN_EARLY_PLIES) return null;
  if (atHome(after, me) < STILL_HOME) return null;
  return said(oneOf(facts.queenTooEarly, move));
}

// The pawns a queen goes far to take in the opening: on the a- and b-files,
// b2 and b7 the classic ones, away from the king.
const GRAB_FILES = new Set([0, 1]);

/** An error in the opening: the queen takes a wing pawn on the other side's half. */
export function pawnGrabFact({ move, facts, me, before }: FactInput): Fact | null {
  const [from, to] = [parseSquare(move.uci.slice(0, 2)), parseSquare(move.uci.slice(2, 4))];
  if (!from || !to || before.get(from)?.role !== 'queen' || move.san.includes('+')) return null;
  if (move.position.ply > OPENING_PLIES) return null;
  const taken = before.get(to);
  const far = ownRank(to, me) >= 5 && GRAB_FILES.has(squareCoords(to)[0]);
  return taken?.role === 'pawn' && far
    ? said(oneOf(facts.pawnGrab(squareToken(move.uci.slice(2, 4))), move))
    : null;
}

// The plies over which moving a minor piece again, the others at home, is time lost.
const TWICE_PLIES = 16;

/** Whether one of `move`'s side's earlier moves brought a piece to `square`. */
function cameTo(move: FactInput['move'], square: string): boolean {
  for (let earlier = move.previousMove?.previousMove; earlier;) {
    if (earlier.uci.slice(2, 4) === square) return true;
    earlier = earlier.previousMove?.previousMove;
  }
  return false;
}

/**
 * An error in the opening that moves a knight or a bishop a second time,
 * unattacked, taking nothing, while the other minor pieces are still at home.
 */
export function pieceTwiceFact({ move, facts, me, them, before, after }: FactInput): Fact | null {
  const from = parseSquare(move.uci.slice(0, 2));
  const piece = from ? before.get(from) : undefined;
  if (!from || (piece?.role !== 'knight' && piece?.role !== 'bishop')) return null;
  if (move.san.includes('x') || move.san.includes('+') || move.position.ply > TWICE_PLIES)
    return null;
  if (attackers(before, from, them).length > 0 || atHome(after, me) < STILL_HOME) return null;
  return cameTo(move, move.uci.slice(0, 2)) ? said(oneOf(facts.pieceTwice(piece), move)) : null;
}

const MOBILITY_LOST = 3;

/**
 * An error in a rook ending: the rook steps back to guard a pawn the other
 * side attacks, and attacks nothing itself.
 */
export function passiveRookFact({ move, facts, me, them, before, after }: FactInput): Fact | null {
  const [from, to] = [parseSquare(move.uci.slice(0, 2)), parseSquare(move.uci.slice(2, 4))];
  const others = [...after.values()].filter(({ role }) => role !== 'king' && role !== 'pawn');
  if (!from || !to || after.get(to)?.role !== 'rook' || move.san.includes('x')) return null;
  if (others.some(({ role }) => role !== 'rook')) return null;
  const seen = attackedSquares(after, to);
  const hits = seen.some(square => after.get(square)?.color === them);
  const guarded = seen.find(
    square =>
      after.get(square)?.role === 'pawn' &&
      after.get(square)?.color === me &&
      attackers(after, square, them).length > 0,
  );
  const lost = attackedSquares(before, from).length - seen.length;
  if (hits || !guarded || lost < MOBILITY_LOST) return null;
  return said(oneOf(facts.passiveRook(squareToken(guarded)), move));
}
