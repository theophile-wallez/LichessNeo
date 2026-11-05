import { type Board, type Color, isInCheck, opposite, type Square } from '#shared/chess/index.ts';
import { destinations, moved } from './moves.ts';

// A mate in one read off the board alone, for the coach to say a move
// threatens mate only when it's sure. Every reply is tried but castling,
// which can't answer a check, and en passant, which no mate in one allows
// after a pass; the mating moves leave out promotions, castling and en
// passant: a mate may go unseen, never one made up.

export interface MateMove {
  readonly from: Square;
  readonly to: Square;
}

const hasReply = (board: Board, color: Color): boolean =>
  [...board].some(
    ([from, piece]) =>
      piece.color === color &&
      destinations(board, from, piece).some(to => !isInCheck(moved(board, from, to), color)),
  );

/** A move of `color`'s that mates at once on `board`, `color` to move; null for none. */
export function mateInOne(board: Board, color: Color): MateMove | null {
  const them = opposite(color);
  for (const [from, piece] of board) {
    if (piece.color !== color) continue;
    for (const to of destinations(board, from, piece)) {
      if (board.get(to)?.role === 'king') continue;
      const next = moved(board, from, to);
      if (!isInCheck(next, color) && isInCheck(next, them) && !hasReply(next, them))
        return { from, to };
    }
  }
  return null;
}
