import { pickCoach } from '#shared/coach.ts';
import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// The coach who reads a practice drill's goal (styles/practice-run/drill.css)
// is the Game Review's coach.
export const coachChoice: Feature = {
  name: 'coach choice',
  start: () => setData(document.documentElement, 'lrExtCoach', String(pickCoach())),
};
