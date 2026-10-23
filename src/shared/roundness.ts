import { z } from 'zod/mini';

// Lichess's Roundness, its Theme menu's slider: the radius of its boxes'
// corners, in px, which it keeps in `---ui-roundness` on <html> and in the
// user's preferences. Ours follow it (scripts/lib/css-roundness.ts).

export const ROUNDNESS_MAX = 15;
export const DEFAULT_ROUNDNESS = 8;

export const RoundnessSchema = z.int().check(z.gte(0), z.lte(ROUNDNESS_MAX));

const ROUNDNESS_VARIABLE = '---ui-roundness';

/** The roundness the page shows, as Lichess writes it inline on <html>. */
export function shownRoundness(): number {
  const written = document.documentElement.style.getPropertyValue(ROUNDNESS_VARIABLE);
  const roundness = RoundnessSchema.safeParse(Number.parseFloat(written));
  return roundness.success ? roundness.data : DEFAULT_ROUNDNESS;
}

/** Shows `radius` on the page, as Lichess's slider does. */
export function showRoundness(radius: number): void {
  document.documentElement.style.setProperty(ROUNDNESS_VARIABLE, `${radius}px`);
}
