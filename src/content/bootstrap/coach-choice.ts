import { type CoachPick, coachOf, coachPick, keepCoach, NO_COACH } from '#shared/coach.ts';
import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { extensionUrl } from '#content/platform/runtime.ts';

// The coach this page shows, on <html> for every coach's place to read
// (#shared/coach.ts): its number, or `none`, under which each place goes without
// one (styles/coach-avatar.css). The coach who reads a practice drill's goal
// (styles/practice-run/drill.css) is the Game Review's coach.

// Kept, so the still stays decoded: a card drawn later shows its coach in its first frame.
let still: HTMLImageElement | null = null;

function showChoice(coach: number | null): void {
  setData(document.documentElement, 'lnExtCoach', coach === null ? NO_COACH : String(coach));
  if (coach === null) return;
  still = new Image();
  still.src = extensionUrl(`img/coaches/mascot-${coach}.webp`);
  // A still that fails to decode is only not ready early: the card loads it as before.
  still.decode().catch(() => undefined);
}

const listeners = new Set<(pick: CoachPick) => void>();

/** Calls `listener` each time the coach is picked on this page, in the settings or the review. */
export function onCoachChosen(listener: (pick: CoachPick) => void): void {
  listeners.add(listener);
}

/** The settings' pick: kept for every page, and shown on this one at once. */
export function chooseCoach(pick: CoachPick): void {
  keepCoach(pick);
  showChoice(coachOf(pick));
  for (const listener of listeners) listener(pick);
}

export const coachChoice: Feature = {
  name: 'coach choice',
  start: () => showChoice(coachOf(coachPick())),
};
