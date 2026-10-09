import { reviewArrows } from '#page/board/review-arrows.ts';
import { portAgainstLegacy, type Scenario } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// Each scenario has a test file of its own: a started review can't be stopped
// (its render interval, its resize listener, its analysis still running), so
// each needs a fresh window, which vitest gives per file.

// The original drew the comments' pieces as bundled images, from the base URL
// the recordings ran with; we draw them from the board's set. Ours are put
// back as recorded, so the recordings stay the reference.
const PIECE_GLYPH = /<i class="lr-ext-pc lr-ext-pc-(\w\w)"><\/i>/g;
const RECORDED_PIECE =
  '<img class="lr-ext-pc" alt="" src="chrome-extension://abc/img/pieces/neo/$1.webp">';

function asRecorded(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(PIECE_GLYPH, RECORDED_PIECE);
  if (Array.isArray(value)) return value.map(asRecorded);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, asRecorded(entry)]));
}

/** What the review shows after each step of `scenario`, by step, for the steps the original recorded. */
export async function portSnapshots(
  scenario: Scenario,
  legacy: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const steps = await portAgainstLegacy(
    scenario,
    { boot: review.start, arrows: reviewArrows },
    legacy,
  );
  return Object.fromEntries(steps.map(({ step, port }) => [step, asRecorded(port)]));
}
