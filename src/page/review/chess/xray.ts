import { parseSquare, type Piece, type Square } from '#shared/chess/index.ts';
import type { Ply } from './played-line.ts';
import { between } from './rays.ts';

// An x-ray: a piece lands on a square, the other side takes it there, and a
// slider behind the taker takes back, through where the taker stood.

export interface Xray {
  /** The slider that takes back, and where it stood. */
  readonly slider: Piece;
  readonly from: Square;
  /** The piece it saw through, and where that stood. */
  readonly screen: Piece;
  readonly through: Square;
  /** The square taken on, then taken back on. */
  readonly square: Square;
}

const SLIDERS = new Set(['bishop', 'rook', 'queen']);

/** The x-ray that ply `i` of `plies` starts, if any. */
export function xrayAt(plies: readonly Ply[], i: number): Xray | null {
  const [lands, takes, again] = [plies[i], plies[i + 1], plies[i + 2]];
  const square = parseSquare(lands?.uci.slice(2, 4) ?? '');
  if (!square || !takes?.captured || !again?.captured || !SLIDERS.has(again.piece.role))
    return null;
  const [from, through] = [parseSquare(again.uci), parseSquare(takes.uci)];
  const onSquare = takes.uci.slice(2, 4) === square && again.uci.slice(2, 4) === square;
  if (!from || !through || !onSquare || !between(from, square).includes(through)) return null;
  return { slider: again.piece, from, screen: takes.piece, through, square };
}
