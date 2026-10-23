import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// What practice keeps of the user's habits, beside their positions: the moves
// practiced each day, for the daily goal and the days in a row it was met, the
// best scores of the timed challenge and the quiz, how deep each opening's
// lines have grown, and the lines starred.

const ProgressSchema = z.object({
  /** Moves practiced by local day ("2026-10-23"), the last few months'. */
  days: z.record(z.string(), z.number()),
  best: z.object({ blitz: z.number(), quiz: z.number() }),
  /** How many of the user's moves an opening's lines go to, by its family, as they grow. */
  depths: z.record(z.string(), z.number()),
  /** The lines starred, as `side|moves`. */
  favorites: z.array(z.string()),
});

export type Progress = z.infer<typeof ProgressSchema>;

export type ScoreKind = keyof Progress['best'];

const DAYS_KEPT = 120;

const empty = (): Progress => ({
  days: {},
  best: { blitz: 0, quiz: 0 },
  depths: {},
  favorites: [],
});

let kept: Progress | null = null;

export function storedProgress(): Progress {
  if (kept) return kept;
  try {
    kept = readStoredJson(StorageKey.practiceProgress, ProgressSchema) ?? empty();
  } catch {
    kept = empty();
  }
  return kept;
}

function keep(change: (progress: Progress) => Progress): Progress {
  kept = change(storedProgress());
  writeStoredJson(StorageKey.practiceProgress, kept);
  return kept;
}

/** The local day of `now`, as the record names it. */
const pad = (value: number): string => String(value).padStart(2, '0');

export function dayKey(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dayBefore = (key: string): string => {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return dayKey(new Date(year, month - 1, day - 1, 12).getTime());
};

/** The moves practiced on `now`'s day. */
export const dayCount = (now: number): number => storedProgress().days[dayKey(now)] ?? 0;

/** A move practiced: today's count once it's in. */
export function noteDay(now: number): number {
  const today = dayKey(now);
  const progress = keep(({ days, ...rest }) => {
    const recent = Object.entries(days).toSorted(([first], [second]) =>
      second.localeCompare(first),
    );
    const counts = Object.fromEntries(recent.slice(0, DAYS_KEPT));
    counts[today] = (counts[today] ?? 0) + 1;
    return { ...rest, days: counts };
  });
  return progress.days[today] ?? 0;
}

/** The days in a row the goal was met, up to today, or to yesterday while today's isn't yet. */
export function dayStreak(goal: number, now: number): number {
  const { days } = storedProgress();
  const met = (key: string): boolean => (days[key] ?? 0) >= goal;
  let key = dayKey(now);
  if (!met(key)) key = dayBefore(key);
  let streak = 0;
  for (; met(key); key = dayBefore(key)) streak++;
  return streak;
}

export const bestOf = (kind: ScoreKind): number => storedProgress().best[kind];

/** A score of the challenge or the quiz: true when it beats the best. */
export function noteScore(kind: ScoreKind, score: number): boolean {
  if (score <= bestOf(kind)) return false;
  keep(progress => ({ ...progress, best: { ...progress.best, [kind]: score } }));
  return true;
}

/** How deep an opening's lines go, once the length grows by itself. */
export const depthOf = (family: string, start: number): number =>
  storedProgress().depths[family] ?? start;

export function keepDepth(family: string, depth: number): void {
  keep(progress => ({ ...progress, depths: { ...progress.depths, [family]: depth } }));
}

export const isFavorite = (key: string): boolean => storedProgress().favorites.includes(key);

export function toggleFavorite(key: string): void {
  keep(progress => ({
    ...progress,
    favorites: isFavorite(key)
      ? progress.favorites.filter(each => each !== key)
      : [...progress.favorites, key],
  }));
}
