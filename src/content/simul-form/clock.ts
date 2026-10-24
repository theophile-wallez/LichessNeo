import { pageLocale } from '#shared/lang.ts';

// The simul's clock as the form sets it: everyone's, and the host's, who may add time at
// the start and for each player who joins.

export interface SimulClock {
  /** Everyone's initial time, in minutes. */
  readonly minutes: number;
  /** Everyone's increment, in seconds. */
  readonly increment: number;
  /** The host's extra time at the start, in minutes, maybe below zero. */
  readonly hostExtra: number;
  /** The host's extra time for each player who joins, in seconds. */
  readonly hostPerPlayer: number;
}

/** How many players the host's clock is shown for, a simul of a fair size. */
export const EXAMPLE_PLAYERS = 30;

/** The time control as Lichess writes it on a simul's card: "20+60". */
export const timeControl = (clock: SimulClock): string => `${clock.minutes}+${clock.increment}`;

/** The host's initial time before anyone joins, in minutes, never below zero. */
export const hostStart = (clock: SimulClock): number =>
  Math.max(0, clock.minutes + clock.hostExtra);

/** The host's initial time once `players` have joined, in minutes. */
export const hostTime = (clock: SimulClock, players: number): number =>
  hostStart(clock) + (players * clock.hostPerPlayer) / 60;

const formatUnit = (value: number, unit: 'minute' | 'second'): string =>
  new Intl.NumberFormat(pageLocale(), {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);

export const formatMinutes = (minutes: number): string => formatUnit(minutes, 'minute');

export const formatSeconds = (seconds: number): string => formatUnit(seconds, 'second');
