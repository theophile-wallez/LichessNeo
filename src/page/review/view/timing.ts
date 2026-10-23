import type { Analysis } from '#page/lichess/analysis.ts';
import { type MoveTime, moveTimes } from '#page/charts/game/series.ts';
import type { MoveTiming } from '#page/review/coach/clock.ts';
import type { GameWork } from '#page/review/session.ts';

// A game move's time, from Lichess's data: what it took, the mover's clock
// before it, and the mover's own pace over the game.

function median(values: readonly number[]): number {
  const sorted = values.toSorted((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** The mover's clock before a move: after it, give the time back (an increment aside). */
const clockBefore = (time: MoveTime): number | null =>
  time.clock === null ? null : time.clock + time.seconds;

/**
 * The game's move times, none without clocks (an import, correspondence), each
 * at the review's index of its move (a game from a position starts past ply 0).
 */
export function gameTimes(analysis: Analysis, { nodes }: GameWork): MoveTime[] {
  const course = analysis.course;
  if (!course || analysis.data?.game.speed === 'correspondence') return [];
  const start = nodes[0]?.ply ?? 0;
  return moveTimes(nodes, course).map(({ ply, color, san, seconds, clock }) => ({
    ply: ply - start,
    color,
    san,
    seconds,
    clock,
  }));
}

/** The time of the game's move at `index`, or null without clocks. */
export function timingAt(analysis: Analysis, work: GameWork, index: number): MoveTiming | null {
  const times = gameTimes(analysis, work);
  const time = times.find(each => each.ply === index);
  const clock = time && clockBefore(time);
  if (!time || clock === null || clock === undefined) return null;
  const own = times.filter(each => each.color === time.color);
  const initial = own[0] ? clockBefore(own[0]) : null;
  if (initial === null) return null;
  return { spent: time.seconds, clock, initial, usual: median(own.map(each => each.seconds)) };
}
