import type { Mark, ReviewArrow } from '#shared/board/marks.ts';

// The Game Review's shapes, drawn by the board's shape layer with the
// players' own: the arrows of the best move, the reply that punishes an
// error and the engine's move after one played off the game, and the
// coach's drawing of what its comment explains (#shared/board/marks.ts).

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
