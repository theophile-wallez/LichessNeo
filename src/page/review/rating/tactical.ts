import { isInCheck, parseFen } from '#shared/chess/index.ts';
import { isHanging } from '#page/review/chess/material.ts';

/**
 * A position with a tactic in it: the side to move is in check, the last
 * move threw away 10% or more (a chance to punish it), or a piece hangs.
 * tools/game-rating/extract.py must agree.
 */
export function isTactical(fen: string, previousLoss: number): boolean {
  const { board, turn } = parseFen(fen);
  if (previousLoss >= 10) return true;
  if (isInCheck(board, turn)) return true;
  return [...board].some(
    ([square, piece]) =>
      piece.role !== 'pawn' && piece.role !== 'king' && isHanging(board, square, piece),
  );
}
