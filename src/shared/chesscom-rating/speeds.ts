import { speedOfClock } from '#shared/custom-seek.ts';

// The speed a rating Lichess shows counts in, from what it shows beside it:
// a perf's glyph, a clock or a stats page's address. Anything else (a
// variant's glyph, a correspondence game) is a rating Chess.com has no pool
// for, so it stays Lichess's.

// lila's licon of each speed's perf.
const GLYPH_SPEEDS: ReadonlyMap<string, string> = new Map([
  ['\ue059', 'ultraBullet'],
  ['\ue032', 'bullet'],
  ['\ue008', 'blitz'],
  ['\ue002', 'rapid'],
  ['\ue00a', 'classical'],
]);

/** The speed of a perf's glyph (`data-icon`). */
export const speedOfGlyph = (glyph: string | null | undefined): string | null =>
  GLYPH_SPEEDS.get(glyph ?? '') ?? null;

/** The speed of a clock written `<seconds>+<increment>`, as a mini game's `data-tc`. */
export function speedOfTimeControl(control: string | null | undefined): string | null {
  const match = /^(\d+)\+(\d+)$/.exec(control ?? '');
  return match ? speedOfClock(Number(match[1]) / 60, Number(match[2])) : null;
}

/** The speed of a rating's stats page (`/@/<user>/perf/blitz`), a link to it, or its leaderboard's. */
export const speedOfPath = (path: string | null | undefined): string | null =>
  /\/(?:perf|player\/top(?:\/\d+)?)\/([A-Za-z]+)$/.exec(path ?? '')?.[1] ?? null;
