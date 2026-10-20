import {
  attackedSquares,
  type Board,
  type Color,
  isInCheck,
  opposite,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';

// A mate in one read off the board alone, for the coach to say a move
// threatens mate only when it's sure. Every reply is tried but castling,
// which can't answer a check, and en passant, which no mate in one allows
// after a pass; the mating moves leave out promotions, castling and en
// passant: a mate may go unseen, never one made up.

export interface MateMove {
  readonly from: Square;
  readonly to: Square;
}

function moved(board: Board, from: Square, to: Square): Board {
  const next = new Map(board);
  const piece = next.get(from);
  next.delete(from);
  if (piece) next.set(to, piece);
  return next;
}

function pushes(board: Board, from: Square, color: Color): Square[] {
  const [file, rank] = squareCoords(from);
  const step = color === 'white' ? 1 : -1;
  const one = squareAt(file, rank + step);
  if (!one || board.has(one)) return [];
  const two = rank === (color === 'white' ? 1 : 6) ? squareAt(file, rank + 2 * step) : null;
  return two && !board.has(two) ? [one, two] : [one];
}

/** Where the piece on `from` may go, its king's safety aside. */
function destinations(board: Board, from: Square, piece: Piece): Square[] {
  const reach = attackedSquares(board, from).filter(square => {
    const there = board.get(square);
    if (piece.role === 'pawn') return there !== undefined && there.color !== piece.color;
    return there?.color !== piece.color;
  });
  return piece.role === 'pawn' ? [...reach, ...pushes(board, from, piece.color)] : reach;
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
