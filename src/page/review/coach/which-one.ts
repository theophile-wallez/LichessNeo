import type { Board, Piece } from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { Reason } from './idea.ts';

// A piece named by its square when its side has more than one like it, "the
// c6 pawn": the square tells which one, as the board shows it.

/** The square of the piece on `square`, as a token, when its side has more than one like it. */
export function whichOne(board: Board, square: string, piece: Piece): string | null {
  const alike = [...board.values()].filter(
    other => other.role === piece.role && other.color === piece.color,
  );
  return alike.length > 1 ? squareToken(square) : null;
}

/** The capture of `piece` on `target`, its square said when it's one of several. */
export function takesReason(board: Board, target: string, piece: Piece): Reason {
  const square = whichOne(board, target, piece);
  return square === null ? { kind: 'takes', piece } : { kind: 'takes', piece, square };
}
