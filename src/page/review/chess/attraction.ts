import { attackedSquares, parseSquare, type Piece, type Square } from '#shared/chess/index.ts';
import type { Ply } from './played-line.ts';

// An attraction: a piece lands on a square, a big piece of the other side's
// takes it there, and the next move strikes that square: the king checked at
// once, or the queen or a rook taken there later.

export interface Attraction {
  /** The piece lured, and the square it was lured to. */
  readonly piece: Piece;
  readonly square: Square;
}

const LURED = new Set(['king', 'queen', 'rook']);

// The big piece that takes on the square ply `i` lands on, and the square.
function lured(plies: readonly Ply[], i: number): Attraction | null {
  const [lands, takes] = [plies[i], plies[i + 1]];
  const square = parseSquare(lands?.uci.slice(2, 4) ?? '');
  if (!square || !takes?.captured || takes.uci.slice(2, 4) !== square) return null;
  return LURED.has(takes.piece.role) ? { piece: takes.piece, square } : null;
}

/** The attraction that ply `i` of `plies` starts, if any. */
export function attractionAt(plies: readonly Ply[], i: number): Attraction | null {
  const found = lured(plies, i);
  const strikes = plies[i + 2];
  const to = parseSquare(strikes?.uci.slice(2, 4) ?? '');
  if (!found || !strikes || !to || !attackedSquares(strikes.after, to).includes(found.square))
    return null;
  if (found.piece.role === 'king') return found;
  return plies[i + 4]?.uci.slice(2, 4) === found.square ? found : null;
}
