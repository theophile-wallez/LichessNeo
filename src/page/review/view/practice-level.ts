import type { Analysis } from '#page/lichess/analysis.ts';
import { levelGroups, playerRatings } from '#page/review/practice/player.ts';
import type { Session } from '#page/review/session.ts';

// Lichess's players of the user's level, for practice: the explorer reads
// their rating groups while a line is practiced from Lichess's games, and its
// own choice comes back once practice stops, as the user left it.

/** The explorer's rating groups before practice changed them. */
let saved: readonly number[] | null = null;

const same = (one: readonly number[], other: readonly number[]): boolean =>
  one.length === other.length && one.every((value, i) => value === other[i]);

/** The groups practice wants the explorer to read; null for the user's own choice. */
function wanted(session: Session, analysis: Analysis): number[] | null {
  const { practice, openings } = session.view;
  const settings = practice?.settings ?? openings.settings;
  if (settings.level !== 'mine' || analysis.explorer?.source?.db !== 'lichess') return null;
  const rating = playerRatings(() => session.redraw(true))?.games;
  return rating ? levelGroups(rating) : null;
}

/** Sets the explorer to the level practice wants: true when it changed, and looks positions up again. */
export function applyLevel(session: Session, analysis: Analysis): boolean {
  const { explorer } = analysis;
  if (!explorer) return false;
  const current = explorer.ratings;
  const want = wanted(session, analysis);
  if (want) {
    if (same(want, current)) return false;
    saved ??= current;
    explorer.setRatings(want);
    return true;
  }
  // The user's own choice again, once practice no longer wants another.
  const back = saved;
  saved = null;
  if (!back || same(back, current)) return false;
  explorer.setRatings(back);
  return true;
}

/** Gives the explorer its own rating groups back. */
export function restoreLevel(analysis: Analysis): void {
  if (saved) analysis.explorer?.setRatings(saved);
  saved = null;
}

/** The user's rating, for the page to name their level; null until Lichess has said. */
export const levelRating = (session: Session): number | null =>
  playerRatings(() => session.redraw(true))?.games ?? null;
