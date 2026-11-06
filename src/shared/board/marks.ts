import type { Square } from '#shared/chess/types.ts';

// The Game Review's shapes, as data: the arrows it draws with the players'
// own, and the strokes of the coach's drawing (drawing.ts), which the review
// puts on its board and the settings on their previews.

export interface ReviewArrow {
  readonly orig: Square;
  readonly dest: Square;
  readonly brush: 'best' | 'threat' | 'engine';
}

/** What a mark stands for, which picks its color: an attack, a defense, a plan. */
export type MarkTone = 'attack' | 'defense' | 'plan';

/** One stroke of the coach's drawing, under the pieces. */
export type Mark =
  /** A passed pawn's square, grown from its corner `from` to `to`, on the queening rank. */
  | { readonly kind: 'area'; readonly from: Square; readonly to: Square }
  | { readonly kind: 'cells'; readonly squares: readonly Square[]; readonly tone: MarkTone }
  /** Squares in a line out from the piece on `from`, on either side: a rook's file, a pawn's road. */
  | {
      readonly kind: 'run';
      readonly from: Square;
      readonly squares: readonly Square[];
      readonly tone: MarkTone;
    }
  | { readonly kind: 'ring'; readonly square: Square; readonly tone: MarkTone }
  /** A line between two squares' centers: an attack, a defense, a pin. */
  | { readonly kind: 'link'; readonly from: Square; readonly to: Square; readonly tone: MarkTone }
  /** A square barred: a king's flight square taken away, striped. */
  | { readonly kind: 'barred'; readonly square: Square; readonly tone: MarkTone };
