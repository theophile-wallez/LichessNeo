import type { Square } from '#shared/chess/types.ts';

// The game the settings' preview board plays (preview.ts): an Italian opening
// that ends on a sacrifice, so it sounds quiet moves, a castle, captures and a check.

export interface PreviewMove {
  readonly from: Square;
  readonly to: Square;
  readonly san: string;
  /** The rook's own slide, for a castle. */
  readonly rook?: readonly [from: Square, to: Square];
}

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export const LINE: readonly PreviewMove[] = [
  { from: 'e2', to: 'e4', san: 'e4' },
  { from: 'e7', to: 'e5', san: 'e5' },
  { from: 'g1', to: 'f3', san: 'Nf3' },
  { from: 'b8', to: 'c6', san: 'Nc6' },
  { from: 'f1', to: 'c4', san: 'Bc4' },
  { from: 'g8', to: 'f6', san: 'Nf6' },
  { from: 'e1', to: 'g1', san: 'O-O', rook: ['h1', 'f1'] },
  { from: 'f6', to: 'e4', san: 'Nxe4' },
  { from: 'c4', to: 'f7', san: 'Bxf7+' },
  { from: 'e8', to: 'f7', san: 'Kxf7' },
];

/** The pieces a move slides, the king's before its rook's. */
export const slidesOf = ({
  from,
  to,
  rook,
}: PreviewMove): readonly (readonly [Square, Square])[] =>
  rook ? [[from, to], rook] : [[from, to]];
