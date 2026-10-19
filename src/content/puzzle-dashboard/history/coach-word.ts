import type { CoachMood } from '#shared/coach.ts';
import type { Line } from '#content/puzzle-dashboard/coach-line.ts';
import { dayName, daysBefore } from './day.ts';
import type { Run } from './week.ts';

// What the coach says of the last 7 days, over the history: the best run if
// there's one worth saying, else how the week went, then what's left to retry.
// Messages by name (public/_locales), with what fills them in.

/** The week's numbers, from Lichess's dashboard API. */
export interface Week {
  readonly puzzles: number;
  readonly firstWins: number;
  /** Puzzles failed, not solved since. */
  readonly toReplay: number;
}

export type Tier = 'up' | 'even' | 'down';

export interface Word {
  readonly lines: readonly Line[];
  readonly mood: CoachMood;
  /** The week's color: green, orange or red. */
  readonly tier: Tier;
}

// Solved first try at least this often, a sharp week; at most, a tough one (as the dashboard).
const SHARP = 0.65;
const TOUGH = 0.4;
/** A shorter run isn't worth a word. */
const RUN_WORTH = 3;

const line = (name: string, ...values: string[]): Line => ({ name, values });

export const tierOf = (share: number): Tier => {
  if (share >= SHARP) return 'up';
  return share > TOUGH ? 'even' : 'down';
};

function opening(share: number, run: Run | null, now: Date, locale?: string): Line {
  if (run && run.length >= RUN_WORTH) {
    const day = dayName(run.at, now, locale);
    // "Today" and "yesterday" read alone; a weekday needs "on".
    const name = daysBefore(run.at, now) < 2 ? 'phistRunDay' : 'phistRunOn';
    return line(name, String(run.length), day);
  }
  return line({ up: 'phistSharp', even: 'phistSteady', down: 'phistTough' }[tierOf(share)]);
}

function left(toReplay: number): Line {
  if (toReplay === 0) return line('phistAllClear');
  return toReplay === 1 ? line('phistMissedOne') : line('phistMissedMany', String(toReplay));
}

const MOODS: Record<Tier, CoachMood> = { up: 'delight', even: 'happy', down: 'worry' };

export function coachWord(week: Week, run: Run | null, now: Date, locale?: string): Word {
  if (week.puzzles === 0)
    return { lines: [line('phistNone'), line('phistNoneBody')], mood: 'neutral', tier: 'even' };
  const share = week.firstWins / week.puzzles;
  return {
    lines: [opening(share, run, now, locale), left(week.toReplay)],
    mood: MOODS[tierOf(share)],
    tier: tierOf(share),
  };
}
