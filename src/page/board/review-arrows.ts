import type { Square } from '#shared/chess/types.ts';

// The Game Review's arrows, drawn by the board's shape layer with the
// players' own: the best move, the reply that punishes an error, and the
// engine's move after one played off the game.

export interface ReviewArrow {
  readonly orig: Square;
  readonly dest: Square;
  readonly brush: 'best' | 'threat' | 'engine';
}

let arrows: readonly ReviewArrow[] = [];
const listeners = new Set<() => void>();

export const reviewArrows = (): readonly ReviewArrow[] => arrows;

export function setReviewArrows(next: readonly ReviewArrow[]): void {
  arrows = next;
  for (const listener of listeners) listener();
}

export function onReviewArrowsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
