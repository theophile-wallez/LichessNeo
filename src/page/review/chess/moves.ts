import {
  attackedSquares,
  type Board,
  type Color,
  isInCheck,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';

// The moves a side may make on a board, read off the board alone: no castling
// and no en passant, which a board doesn't say are allowed, and a pawn that
// promotes stays a pawn.

export function moved(board: Board, from: Square, to: Square): Board {
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
export function destinations(board: Board, from: Square, piece: Piece): Square[] {
  const reach = attackedSquares(board, from).filter(square => {
    const there = board.get(square);
    if (piece.role === 'pawn') return there !== undefined && there.color !== piece.color;
    return there?.color !== piece.color;
  });
  return piece.role === 'pawn' ? [...reach, ...pushes(board, from, piece.color)] : reach;
}

/** Every move `color` may make on `board`, its king safe after it. */
export function legalMoves(board: Board, color: Color): [Square, Square][] {
  return [...board].flatMap(([from, piece]) =>
    piece.color === color
      ? destinations(board, from, piece)
          .filter(to => !isInCheck(moved(board, from, to), color))
          .map((to): [Square, Square] => [from, to])
      : [],
  );
}
