import type { Square } from '#shared/chess/types.ts';

// The Game Review's shapes, drawn by the board's shape layer with the
// players' own: the arrows of the best move, the reply that punishes an
// error and the engine's move after one played off the game, and the
// coach's drawing of what its comment explains.

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
  | { readonly kind: 'ring'; readonly square: Square; readonly tone: MarkTone }
  /** A line between two squares' centers: an attack, a defense, a pin. */
  | { readonly kind: 'link'; readonly from: Square; readonly to: Square; readonly tone: MarkTone }
  /** A square barred: a king's flight square taken away, striped. */
  | { readonly kind: 'barred'; readonly square: Square; readonly tone: MarkTone };

let arrows: readonly ReviewArrow[] = [];
let drawing: readonly Mark[] = [];
const listeners = new Set<() => void>();

const changed = (): void => {
  for (const listener of listeners) listener();
};

export const reviewArrows = (): readonly ReviewArrow[] => arrows;

export function setReviewArrows(next: readonly ReviewArrow[]): void {
  arrows = next;
  changed();
}

export const reviewDrawing = (): readonly Mark[] => drawing;

export function setReviewDrawing(next: readonly Mark[]): void {
  drawing = next;
  changed();
}

export function onReviewArrowsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
