import {
  type Board,
  type Color,
  opposite,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';

// What the board's pawns and pieces make of a square: passed pawns, outposts,
// open files, the endgame.

/** The rank as seen from `color`'s side, 0 its own back rank. */
export const ownRank = (square: Square, color: Color): number => {
  const rank = squareCoords(square)[1];
  return color === 'white' ? rank : 7 - rank;
};

/** The ranks of `color`'s pawns on `file`. */
export function pawnsOn(board: Board, file: number, color: Color): number[] {
  const ranks: number[] = [];
  for (const [square, piece] of board) {
    const [pawnFile, rank] = squareCoords(square);
    if (piece.role === 'pawn' && piece.color === color && pawnFile === file) ranks.push(rank);
  }
  return ranks;
}

/** Whether the other side has a pawn on `files` ahead of `square`, from `color`'s side. */
function pawnAhead(board: Board, square: Square, color: Color, files: readonly number[]): boolean {
  const ahead = ownRank(square, color);
  return files.some(file =>
    pawnsOn(board, file, opposite(color)).some(rank => {
      const seen = squareAt(file, rank);
      return seen !== null && ownRank(seen, color) > ahead;
    }),
  );
}

export function isPassed(board: Board, square: Square, color: Color): boolean {
  const file = squareCoords(square)[0];
  return !pawnAhead(board, square, color, [file - 1, file, file + 1]);
}

// A knight on the other side's half, held by a pawn, no pawn of theirs able to come at it.
export function isOutpost(board: Board, square: Square, piece: Piece): boolean {
  const [file] = squareCoords(square);
  const rank = ownRank(square, piece.color);
  const back = piece.color === 'white' ? -1 : 1;
  const holders = [file - 1, file + 1].flatMap(side => {
    const holder = squareAt(side, squareCoords(square)[1] + back);
    return holder ? [board.get(holder)] : [];
  });
  const held = holders.some(holder => holder?.role === 'pawn' && holder.color === piece.color);
  return (
    rank >= 3 && rank <= 5 && held && !pawnAhead(board, square, piece.color, [file - 1, file + 1])
  );
}

const pieceCount = (board: Board): number =>
  [...board.values()].filter(piece => piece.role !== 'pawn' && piece.role !== 'king').length;

/** Few pieces left, the queens gone. */
export const isEndgame = (board: Board): boolean =>
  pieceCount(board) <= 6 && ![...board.values()].some(({ role }) => role === 'queen');

export const centerDistance = (square: Square): number => {
  const [file, rank] = squareCoords(square);
  return Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));
};
