import { CoachIdSchema, pickCoach } from '#shared/coach.ts';

/** The coach picked at boot (bootstrap/coach-choice.ts), or one at random before it is. */
export function chosenCoach(): number {
  const parsed = CoachIdSchema.safeParse(document.documentElement.dataset.lrExtCoach);
  return parsed.success ? parsed.data : pickCoach();
}
