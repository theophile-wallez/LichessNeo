import { z } from 'zod/mini';

// A real-time game sought in Lichess's lobby, as its game setup makes one
// (lila's ui/lobby/src/setupCtrl.ts): a variant, a clock, rated or not. The
// home's custom cards seek them, from the content script through the page's.

/** The variants a lobby seek can be in, Standard first (lila's lib/game/perf.ts). */
export const VARIANTS = [
  'standard',
  'chess960',
  'crazyhouse',
  'kingOfTheHill',
  'threeCheck',
  'antichess',
  'atomic',
  'horde',
  'racingKings',
] as const;

export type Variant = (typeof VARIANTS)[number];

/** The minutes Lichess's setup slider offers (lila's lib/setup/timeControl.ts). */
export const MINUTES: readonly number[] = [
  0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25, 30, 35, 40, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180,
];

/** The increments, in seconds, it offers. */
export const INCREMENTS: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 60,
  90, 120, 150, 180,
];

/** A clock the setup offers; one with no time at all can't be played. */
export const ClockSchema = z
  .object({
    minutes: z.number().check(z.refine(minutes => MINUTES.includes(minutes))),
    increment: z.number().check(z.refine(increment => INCREMENTS.includes(increment))),
  })
  .check(z.refine(({ minutes, increment }) => minutes > 0 || increment > 0));

export const CustomSeekSchema = z.intersection(
  ClockSchema,
  z.object({ variant: z.enum(VARIANTS), rated: z.boolean() }),
);

export type CustomSeek = z.infer<typeof CustomSeekSchema>;

/** The ratings a seek's games count in: a speed's in Standard, a variant's otherwise. */
export const SEEK_PERFS = [
  'ultraBullet',
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'chess960',
  'crazyhouse',
  'kingOfTheHill',
  'threeCheck',
  'antichess',
  'atomic',
  'horde',
  'racingKings',
] as const;

export type SeekPerf = (typeof SEEK_PERFS)[number];

export type ClockSpeed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical';

/** The speed of a clock, as Lichess counts it: the time for 40 moves (lila's lib/game). */
export function speedOfClock(minutes: number, increment: number): ClockSpeed {
  const total = minutes * 60 + increment * 40;
  if (total < 30) return 'ultraBullet';
  if (total < 180) return 'bullet';
  if (total < 480) return 'blitz';
  return total < 1500 ? 'rapid' : 'classical';
}

/** The rating a seek's games count in: its variant's, or its clock's speed in Standard. */
export const perfOfSeek = ({ variant, minutes, increment }: CustomSeek): SeekPerf =>
  variant === 'standard' ? speedOfClock(minutes, increment) : variant;

const FRACTIONS: ReadonlyMap<number, string> = new Map([
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
  [1.5, '1½'],
]);

/** "½" for half a minute, "10" for ten. */
export const minutesLabel = (minutes: number): string => FRACTIONS.get(minutes) ?? String(minutes);

/** "10 min" for 10+0, "3 + 1", "½ min": a clock's label in any language. */
export function clockLabel(minutes: number, increment: number): string {
  const time = minutesLabel(minutes);
  return increment === 0 ? `${time} min` : `${time} + ${increment}`;
}
