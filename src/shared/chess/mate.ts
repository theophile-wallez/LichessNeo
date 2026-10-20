import { attackedSquares, kingSquare } from './attacks.ts';
import { parseFen, sideToMove } from './fen.ts';
import { parseSquare } from './squares.ts';
import { opposite, type Square } from './types.ts';

// A checkmate on the board: the king mated, and the piece that mates it.

export interface MatePosition {
  readonly fen: string;
  readonly san?: string | undefined;
  readonly uci?: string | undefined;
}

export interface Checkmate {
  readonly king: Square;
  /**
   * The piece giving the mate: the one that moved, unless it uncovered another's
   * check. Null on a board where nothing attacks the king (a variant's, a FEN typed in).
   */
  readonly by: Square | null;
}

/** The mate in a position its move's SAN marks with "#", or null. */
export function checkmate(position: MatePosition | null): Checkmate | null {
  if (!position?.san?.endsWith('#') || !position.fen) return null;
  // The side to move is the one mated. A FEN that doesn't say whose turn it is
  // reads as black's, as it did in the original.
  const mated = sideToMove(position.fen) ?? 'black';
  const { board } = parseFen(position.fen);
  const king = kingSquare(board, mated);
  if (!king) return null;
  const checkers = [...board]
    .filter(
      ([from, piece]) =>
        piece.color === opposite(mated) && attackedSquares(board, from).includes(king),
    )
    .map(([from]) => from);
  const moved = parseSquare(position.uci?.slice(2, 4) ?? '');
  const by = moved && checkers.includes(moved) ? moved : (checkers[0] ?? moved);
  return { king, by };
}
