import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareAt,
  squareCoords,
  isLightSquare,
} from '#shared/chess/index.ts';
import { legalMoves } from '#page/review/chess/moves.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { kingDistance, pawnEnding } from './pawn-square.ts';
import { ownRank } from './structure.ts';

// The rules of the simplest pawn endings, as a king's step meets them: a key
// square reached with king and pawn against king, the corner a rook pawn
// can't be won from. The rook endings' are in rook-endings.ts.

/** The pieces of `color` on `board`, kings aside, each with its square. */
export const piecesOf = (board: Board, color: Color): [Square, string][] =>
  [...board].flatMap(([square, piece]) =>
    piece.color === color && piece.role !== 'king' ? [[square, piece.role] as const] : [],
  );

export const onlyPieces = (
  board: Board,
  color: Color,
  roles: readonly string[],
): Square[] | null => {
  const pieces = piecesOf(board, color);
  const kinds = pieces.map(([, role]) => role).toSorted();
  return kinds.join() === [...roles].toSorted().join() ? pieces.map(([square]) => square) : null;
};

const absoluteRank = (rank: number, color: Color): number => (color === 'white' ? rank : 7 - rank);

/** The squares a king must reach, ahead of its one pawn on `pawn`, for the pawn to queen. */
export function keySquaresOf(pawn: Square, color: Color): Square[] {
  const [file] = squareCoords(pawn);
  const rank = ownRank(pawn, color);
  if (file === 0 || file === 7) {
    const beside = file === 0 ? 1 : 6;
    return [6, 7].flatMap(ahead => squareAt(beside, absoluteRank(ahead, color)) ?? []);
  }
  // On its seventh, the squares beside it and those of the last rank around its queening square.
  if (rank === 6)
    return [
      ...[file - 1, file + 1].flatMap(side => squareAt(side, absoluteRank(6, color)) ?? []),
      ...[file - 1, file, file + 1].flatMap(side => squareAt(side, absoluteRank(7, color)) ?? []),
    ];
  const ranks = rank >= 4 ? [rank + 1, rank + 2] : [rank + 2];
  return ranks.flatMap(ahead =>
    [file - 1, file, file + 1].flatMap(side => squareAt(side, absoluteRank(ahead, color)) ?? []),
  );
}

export interface Step {
  readonly after: Board;
  readonly color: Color;
  readonly from: Square;
  readonly to: Square;
}

// King and pawn against king: the king steps onto a key square, the pawn safe.
function keySquareOf({ after, color, from, to }: Step): Plan | null {
  const [pawn] = onlyPieces(after, color, ['pawn']) ?? [];
  if (!pawn || !pawnEnding(after) || piecesOf(after, opposite(color)).length > 0) return null;
  const keys = keySquaresOf(pawn, color);
  const attacked = attackersOn(after, pawn, opposite(color)).length > 0;
  const safe = !attacked || kingDistance(to, pawn) === 1;
  // A knight pawn on its sixth stalemates the cornered king: no rule there.
  const stalemate = legalMoves(after, opposite(color)).length === 0;
  return keys.includes(to) && !keys.includes(from) && safe && !stalemate
    ? { kind: 'keySquare' }
    : null;
}

// A bishop that doesn't cover the rook pawns' queening square can't drive the king out either.
const wrongBishop = (bishops: readonly Square[], corner: Square): boolean =>
  bishops.every(square => isLightSquare(square) !== isLightSquare(corner));

/**
 * The corner `color`'s bare king draws in, against rook pawns on one file
 * alone, or with the wrong bishop: none can drive it out.
 */
export function drawingCorner(after: Board, color: Color): Square | null {
  const them = opposite(color);
  const theirs = piecesOf(after, them);
  const pawns = theirs.filter(([, role]) => role === 'pawn').map(([square]) => square);
  const bishops = theirs.filter(([, role]) => role === 'bishop').map(([square]) => square);
  const files = new Set(pawns.map(square => squareCoords(square)[0]));
  const [file] = [...files];
  const others = theirs.length - pawns.length - bishops.length;
  if (file === undefined || files.size !== 1 || (file !== 0 && file !== 7) || others > 0)
    return null;
  const corner = squareAt(file, absoluteRank(7, them));
  if (!corner || piecesOf(after, color).length > 0 || !wrongBishop(bishops, corner)) return null;
  return corner;
}

// The king steps next to that corner, or into it.
function cornerOf({ after, color, from, to }: Step): Plan | null {
  const corner = drawingCorner(after, color);
  if (!corner) return null;
  const near = (square: Square): boolean => kingDistance(square, corner) <= 1;
  return near(to) && !near(from) ? { kind: 'cornerDraw' } : null;
}

/**
 * Whether the ending on `board` is decided by a rule already: king and pawn
 * against king, the king on a key square; or the defending king in the corner
 * of the rook pawns. The opposition no longer matters there.
 */
export function decidedEnding(board: Board): boolean {
  const pawns = [...board].filter(([, piece]) => piece.role === 'pawn');
  const [first] = pawns;
  if (!first || !pawnEnding(board)) return false;
  const [square, pawn] = first;
  const king = kingSquare(board, pawn.color);
  if (pawns.length === 1 && king && keySquaresOf(square, pawn.color).includes(king)) return true;
  const sameSide = pawns.every(([, other]) => other.color === pawn.color);
  const file = squareCoords(square)[0];
  const onFile = pawns.every(([at]) => squareCoords(at)[0] === file);
  const corner = squareAt(file, absoluteRank(7, pawn.color));
  const defender = kingSquare(board, opposite(pawn.color));
  const edge = file === 0 || file === 7;
  return (
    sameSide && onFile && edge && !!corner && !!defender && kingDistance(defender, corner) <= 1
  );
}

/** What a king's step does by an ending's rules: a key square, a corner that draws. */
export const kingRuleOf = (move: Step): Plan | null => keySquareOf(move) ?? cornerOf(move);
