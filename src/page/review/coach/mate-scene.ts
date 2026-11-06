import {
  attackedSquares,
  type Board,
  type Color,
  opposite,
  type Role,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import { ownRank } from './structure.ts';

// A mate's board as the named mates read it: the mated king, the one piece
// that checks it, and the squares around it, each own, empty or covered.

export interface MateScene {
  readonly board: Board;
  /** The board without the mated king, the squares behind it along a check covered. */
  readonly open: Board;
  readonly king: Square;
  readonly mated: Color;
  readonly mater: Color;
  readonly checker: Square;
  readonly role: Role;
}

export function sceneOf(board: Board, king: Square, mated: Color, checker: Square): MateScene {
  const open = new Map(board);
  open.delete(king);
  const role = board.get(checker)?.role ?? 'king';
  return { board, open, king, mated, mater: opposite(mated), checker, role };
}

/** The file and rank steps from `from` to `to`. */
export function stepsTo(from: Square, to: Square): readonly [number, number] {
  const [fromFile, fromRank] = squareCoords(from);
  const [toFile, toRank] = squareCoords(to);
  return [toFile - fromFile, toRank - fromRank];
}

/** Whether `to` touches `from` along a file or a rank. */
export const straightBeside = (from: Square, to: Square): boolean => {
  const [file, rank] = stepsTo(from, to);
  return Math.abs(file) + Math.abs(rank) === 1;
};

/** Whether `to` touches `from` on a diagonal. */
export const diagonalBeside = (from: Square, to: Square): boolean => {
  const [file, rank] = stepsTo(from, to);
  return Math.abs(file) === 1 && Math.abs(rank) === 1;
};

/** The square `file` and `rank` steps from `square`, if on the board. */
export function offset(square: Square, file: number, rank: number): Square | null {
  const [from, to] = squareCoords(square);
  return squareAt(from + file, to + rank);
}

/** The squares around the mated king. */
export const neighborsOf = ({ king, mated }: MateScene): Square[] =>
  attackedSquares(new Map([[king, { role: 'king', color: mated }]]), king);

export const isOwn = ({ board, mated }: MateScene, square: Square | null): boolean =>
  square !== null && board.get(square)?.color === mated;

/** The roles of the mating side's pieces that cover `square`, the king out of the way. */
export const coverOf = ({ open, mater }: MateScene, square: Square): Role[] =>
  attackersOn(open, square, mater).flatMap(from => open.get(from)?.role ?? []);

/** The roles of the mating side's pieces that defend the checker. */
export const defendersOf = ({ board, mater, checker }: MateScene): Role[] =>
  attackersOn(board, checker, mater).flatMap(from => board.get(from)?.role ?? []);

const EDGES = new Set([0, 7]);

/** How many edges of the board the king stands on: two in a corner. */
export function edgesOf({ king }: MateScene): number {
  const [file, rank] = squareCoords(king);
  return Number(EDGES.has(file)) + Number(EDGES.has(rank));
}

export const onBackRank = ({ king, mated }: MateScene): boolean => ownRank(king, mated) === 0;

/** Whether the checker checks from along a rank or a file. */
export function checksStraight({ king, checker }: MateScene): boolean {
  const [file, rank] = stepsTo(king, checker);
  return file === 0 || rank === 0;
}
