import { SPEEDS } from '#content/sidebar/top-rating.ts';
import { VARIANTS, type ProfileUser } from './user.ts';

// The profile's medals: each family counts something Lichess's public API
// gives, and is won in four metals as the count passes each step.

export const METALS = ['bronze', 'silver', 'gold', 'crystal'] as const;
export type Metal = (typeof METALS)[number];

export const MEDAL_IDS = [
  'games',
  'wins',
  'peak',
  'puzzles',
  'storm',
  'streak',
  'variants',
  'veteran',
  'marathon',
] as const;
export type MedalId = (typeof MEDAL_IDS)[number];

type Steps = readonly [number, number, number, number];

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const HOUR_S = 3600;
// Enough games in a variant to count it as played.
const VARIANT_GAMES = 10;

/** The best settled rating of a speed. */
function peak({ perfs }: ProfileUser): number {
  const settled = SPEEDS.map(speed => perfs[speed]).filter(perf => perf && !perf.prov);
  return Math.max(0, ...settled.map(perf => perf?.rating ?? 0));
}

const variants = ({ perfs }: ProfileUser): number =>
  VARIANTS.filter(variant => (perfs[variant]?.games ?? 0) >= VARIANT_GAMES).length;

interface Family {
  readonly value: (user: ProfileUser, now: number) => number;
  readonly steps: Steps;
}

const FAMILIES: Readonly<Record<MedalId, Family>> = {
  games: { value: user => user.count?.all ?? 0, steps: [100, 1000, 5000, 20000] },
  wins: { value: user => user.count?.win ?? 0, steps: [50, 500, 2500, 10000] },
  peak: { value: peak, steps: [1500, 1800, 2100, 2400] },
  puzzles: { value: user => user.perfs.puzzle?.games ?? 0, steps: [100, 1000, 5000, 20000] },
  storm: { value: user => user.perfs.storm?.score ?? 0, steps: [20, 40, 60, 80] },
  streak: { value: user => user.perfs.streak?.score ?? 0, steps: [10, 20, 35, 50] },
  variants: { value: variants, steps: [1, 3, 5, 8] },
  veteran: { value: (user, now) => (now - user.createdAt) / YEAR_MS, steps: [1, 3, 5, 10] },
  marathon: { value: user => (user.playTime?.total ?? 0) / HOUR_S, steps: [10, 100, 500, 2000] },
};

export interface Medal {
  readonly id: MedalId;
  /** What the family counts, rounded down. */
  readonly value: number;
  /** The best metal won, null before the first step. */
  readonly metal: Metal | null;
  /** The next step's count, null once crystal. */
  readonly next: number | null;
  /** How far toward the next step, from the last one (0 to 1). */
  readonly progress: number;
}

export function medalOf(id: MedalId, user: ProfileUser, now: number): Medal {
  const { value: count, steps } = FAMILIES[id];
  const value = Math.floor(count(user, now));
  const won = steps.filter(step => value >= step).length;
  const next = steps[won] ?? null;
  const from = steps[won - 1] ?? 0;
  const progress = next === null ? 1 : (value - from) / (next - from);
  return { id, value, metal: METALS[won - 1] ?? null, next, progress };
}

const rank = (medal: Medal): number => (medal.metal === null ? -1 : METALS.indexOf(medal.metal));

/** Every family's medal: the best metals first, then the nearest to their first. */
export function medals(user: ProfileUser, now: number): Medal[] {
  return MEDAL_IDS.map(id => medalOf(id, user, now)).toSorted(
    (first, second) => rank(second) - rank(first) || second.progress - first.progress,
  );
}

/** Steps won over every family, and how many there are. */
export function stepsWon(list: readonly Medal[]): { readonly won: number; readonly of: number } {
  return {
    won: list.reduce((sum, medal) => sum + rank(medal) + 1, 0),
    of: list.length * METALS.length,
  };
}
