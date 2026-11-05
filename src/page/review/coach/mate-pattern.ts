import {
  attackedSquares,
  type Board,
  type Color,
  fenTurn,
  kingSquare,
  opposite,
  parseFen,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/board-after.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { FactSentences } from '#page/review/i18n/types.ts';
import { ownRank } from './structure.ts';
import { isNew, type Told } from './told.ts';

// The mates with a name: the back-rank mate, the king walled in by its own
// pawns; the smothered mate, the king buried under its own pieces; the Arabian
// mate, a rook beside the cornered king, held by a knight; the epaulette mate,
// the queen in front of a king flanked by its own pieces. Said after the mate.

export type MatePattern = 'backRank' | 'smothered' | 'arabian' | 'epaulette';

const own = (board: Board, square: Square, color: Color): boolean =>
  board.get(square)?.color === color;

/** The squares around `king`. */
const neighborsOf = (king: Square, color: Color): Square[] =>
  attackedSquares(new Map([[king, { role: 'king', color }]]), king);

// The king's every neighbor its own piece, the one checker a knight.
function smothered(board: Board, king: Square, mated: Color, checker: Square): boolean {
  const buried = neighborsOf(king, mated).every(square => own(board, square, mated));
  return board.get(checker)?.role === 'knight' && buried;
}

// The king on its back rank, checked along it by a rook or a queen, the
// squares in front of it held by its own pieces, pawns two of them at least,
// or covered.
function backRank(board: Board, king: Square, mated: Color, checker: Square): boolean {
  const role = board.get(checker)?.role;
  const along = squareCoords(checker)[1] === squareCoords(king)[1];
  if (ownRank(king, mated) !== 0 || !along || (role !== 'rook' && role !== 'queen')) return false;
  const front = neighborsOf(king, mated).filter(square => ownRank(square, mated) === 1);
  const pawns = front.filter(
    square => board.get(square)?.role === 'pawn' && own(board, square, mated),
  );
  const shut = front.every(
    square => own(board, square, mated) || attackersOn(board, square, opposite(mated)).length > 0,
  );
  return pawns.length >= 2 && shut;
}

const EDGES = new Set([0, 7]);

// The cornered king checked by a rook beside it, a knight holding the rook.
function arabian(board: Board, king: Square, mated: Color, checker: Square): boolean {
  const [file, rank] = squareCoords(king);
  const [checkerFile, checkerRank] = squareCoords(checker);
  const beside = Math.abs(file - checkerFile) + Math.abs(rank - checkerRank) === 1;
  const held = attackersOn(board, checker, opposite(mated)).some(
    square => board.get(square)?.role === 'knight',
  );
  const cornered = EDGES.has(file) && EDGES.has(rank);
  return cornered && board.get(checker)?.role === 'rook' && beside && held;
}

// The queen checking down the king's file, the king's neighbors on its rank both its own.
function epaulette(board: Board, king: Square, mated: Color, checker: Square): boolean {
  const [file, rank] = squareCoords(king);
  const flanks = [file - 1, file + 1].map(side => squareAt(side, rank));
  const flanked = flanks.every(square => square !== null && own(board, square, mated));
  const [checkerFile] = squareCoords(checker);
  return board.get(checker)?.role === 'queen' && checkerFile === file && flanked;
}

/** The name of the mate of `mated`'s king on `board`, if it has one. */
export function matePatternOf(board: Board, mated: Color): MatePattern | null {
  const king = kingSquare(board, mated);
  const checkers = king ? attackersOn(board, king, opposite(mated)) : [];
  const [checker] = checkers;
  if (!king || !checker || checkers.length > 1) return null;
  if (smothered(board, king, mated, checker)) return 'smothered';
  if (backRank(board, king, mated, checker)) return 'backRank';
  if (arabian(board, king, mated, checker)) return 'arabian';
  return epaulette(board, king, mated, checker) ? 'epaulette' : null;
}

/** The board a record's mate ends on, played from `fen`, when its line reaches it. */
export function mateBoard(record: PositionRecord, fen: string): Board | null {
  if (!('mate' in record) || record.mate === 0) return null;
  const mating: Color = record.mate > 0 ? 'white' : 'black';
  const moves = record.line ?? (record.best ? [record.best] : []);
  const length = 2 * Math.abs(record.mate) - (fenTurn(fen) === mating ? 1 : 0);
  const last = playLine(fen, moves.slice(0, length)).at(-1);
  if (!last || last.color !== mating || moves.length < length) return null;
  return boardAfter(last.before, last.uci);
}

interface Named {
  readonly mated: Color;
  readonly facts: FactSentences;
  /** What the moves just before said; none, and the name is said. */
  readonly told?: Told | undefined;
}

/**
 * `text`, then the mate's name when `board` shows `mated`'s king mated in one
 * of the named ways, said once over the moves that lead to it.
 */
export function withPattern(
  text: string,
  board: Board | null,
  { mated, facts, told }: Named,
): string {
  const pattern = board && matePatternOf(board, mated);
  if (!pattern || (told && !isNew(told, 'matePattern', `${pattern}:${mated}`))) return text;
  return `${text} ${facts.matePattern(pattern)[0]}`;
}

/** The board after the mate on `fen` `uci` plays. */
export const matedBy = (fen: string, uci: string | null | undefined): Board | null =>
  uci ? boardAfter(parseFen(fen).board, uci) : null;
