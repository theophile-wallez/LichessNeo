import type { CoachMood } from '#shared/coach.ts';

// How the coach looks at each step of a puzzle, read from the classes of
// Lichess's status card.

const STEPS = ['play', 'good', 'fail', 'after'] as const;
export type PuzzleStep = (typeof STEPS)[number];

/** The step the status card shows, if it's one the coach reacts to. */
export function readStep(feedback: Element): PuzzleStep | null {
  return STEPS.find(step => feedback.classList.contains(step)) ?? null;
}

/** The coach's face for a step; `solved` once the puzzle is over without a mistake. */
export function puzzleMood(step: PuzzleStep, solved: boolean): CoachMood {
  if (step === 'good') return 'happy';
  if (step === 'fail') return 'worry';
  if (step === 'after' && solved) return 'delight';
  return 'neutral';
}
