import { keepCoach, pickCoach } from '#shared/coach.ts';
import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// The coach who reads a practice drill's goal (styles/practice-run/drill.css)
// is the Game Review's coach.

const showChoice = (coach: number): void =>
  setData(document.documentElement, 'lrExtCoach', String(coach));

/** The settings' pick: kept for every page, and shown on this one at once. */
export function chooseCoach(coach: number): void {
  keepCoach(coach);
  showChoice(coach);
}

export const coachChoice: Feature = {
  name: 'coach choice',
  start: () => showChoice(pickCoach()),
};
