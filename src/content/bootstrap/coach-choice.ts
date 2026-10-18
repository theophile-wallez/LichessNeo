import { keepCoach, pickCoach } from '#shared/coach.ts';
import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { extensionUrl } from '#content/platform/runtime.ts';

// The coach who reads a practice drill's goal (styles/practice-run/drill.css)
// is the Game Review's coach.

// Kept, so the still stays decoded: a card drawn later shows its coach in its first frame.
let still: HTMLImageElement | null = null;

function showChoice(coach: number): void {
  setData(document.documentElement, 'lnExtCoach', String(coach));
  still = new Image();
  still.src = extensionUrl(`img/coaches/mascot-${coach}.webp`);
  // A still that fails to decode is only not ready early: the card loads it as before.
  still.decode().catch(() => undefined);
}

/** The settings' pick: kept for every page, and shown on this one at once. */
export function chooseCoach(coach: number): void {
  keepCoach(coach);
  showChoice(coach);
}

export const coachChoice: Feature = {
  name: 'coach choice',
  start: () => showChoice(pickCoach()),
};
