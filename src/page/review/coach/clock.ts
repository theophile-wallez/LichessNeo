import type { Color } from '#shared/chess/types.ts';
import { clockTime } from '#shared/clock-time.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { ClockStrings } from '#page/review/i18n/types.ts';

// What the coach says of a move's time, against the clock the player had and
// their own pace: an error played fast with time to spare, one played in time
// trouble, a long think that found a good move.

export interface MoveTiming {
  /** Seconds the move took. */
  readonly spent: number;
  /** The mover's clock before the move, in seconds. */
  readonly clock: number;
  /** The mover's clock at the start. */
  readonly initial: number;
  /** The mover's median time per move over the game. */
  readonly usual: number;
}

export type ClockNote = 'rushed' | 'timeTrouble' | 'paidOff';

const ERRORS: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder', 'miss']);
const FOUND: ReadonlySet<MoveClass> = new Set<MoveClass>(['brilliant', 'great', 'best']);
/** Roughly the moves still to play, to share the clock between. */
const MOVES_AHEAD = 20;

export function clockNote(moveClass: MoveClass, timing: MoveTiming): ClockNote | null {
  const { spent, clock, initial, usual } = timing;
  if (ERRORS.has(moveClass)) {
    if (clock < Math.max(10, initial * 0.1)) return 'timeTrouble';
    return spent < (clock / MOVES_AHEAD) * 0.3 && spent <= usual ? 'rushed' : null;
  }
  return FOUND.has(moveClass) && spent >= Math.max(5, usual * 3, initial * 0.04) ? 'paidOff' : null;
}

/** "0.8 s", "12 s", "1:24". */
export function spentTime(seconds: number, strings: ClockStrings): string {
  if (seconds >= 60) return clockTime(seconds);
  return strings.seconds(seconds < 10 ? Math.round(seconds * 10) / 10 : Math.round(seconds));
}

export interface ClockInput {
  readonly note: ClockNote;
  readonly timing: MoveTiming;
  readonly mover: Color;
}

export function clockSentence({ note, timing, mover }: ClockInput, strings: ClockStrings): string {
  const spent = spentTime(timing.spent, strings);
  if (note === 'rushed') return strings.rushed(mover, spent, clockTime(timing.clock));
  if (note === 'timeTrouble') return strings.timeTrouble(clockTime(timing.clock));
  return strings.paidOff(mover, spent);
}
