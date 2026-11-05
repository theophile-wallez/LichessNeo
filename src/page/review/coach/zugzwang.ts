import { type Board, type Color, isInCheck, opposite, type Square } from '#shared/chess/index.ts';
import { isHanging } from '#page/review/chess/material.ts';
import { legalMoves, moved } from '#page/review/chess/moves.ts';
import { isEndgame } from './structure.ts';

// Zugzwang, read off the board: in an ending, nothing of the other side's
// can be won as things stand, but each move it has leaves something to take.
// It would hold if it could pass.

const loses = (board: Board, color: Color): boolean =>
  [...board].some(
    ([square, piece]) =>
      piece.color === color && piece.role !== 'king' && isHanging(board, square, piece),
  );

/** Whether the move, from `from` to `to`, leaves the other side in zugzwang on `after`. */
export function isZugzwang(after: Board, [from, to]: [Square, Square], color: Color): boolean {
  const them = opposite(color);
  // A pawn's double step may be taken en passant, which the board can't tell.
  const doubleStep =
    after.get(to)?.role === 'pawn' && Math.abs(Number(from[1]) - Number(to[1])) === 2;
  if (doubleStep || !isEndgame(after) || isInCheck(after, them) || loses(after, them)) return false;
  const moves = legalMoves(after, them);
  // A capture takes something back for what it gives.
  if (moves.length === 0 || moves.some(([, square]) => after.has(square))) return false;
  return moves.every(([start, end]) => loses(moved(after, start, end), them));
}
