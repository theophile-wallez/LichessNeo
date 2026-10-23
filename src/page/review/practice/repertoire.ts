import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// What practice keeps of the user's openings: each position they had to move
// from, per side, with the moves they found there, the first their own (the
// move their repertoire plays), and how it went. Every position comes back to
// review (spaced repetition): at once after a miss, then later each time it's
// found at the first try. The same record, summed by opening, says how well
// the user knows each; the user's Lichess studies keep a copy (practice/sync.ts).

const EntrySchema = z.object({
  side: z.enum(['white', 'black']),
  /** The moves from the start to the position, in SAN. */
  moves: z.array(z.string()),
  /** The opening it's in, named; '' for none. */
  name: z.string(),
  /** The moves the user found from it: the first is their repertoire's. */
  answers: z.array(z.string()),
  /** How many times they moved from it, and missed the move. */
  seen: z.number(),
  missed: z.number(),
  /** How many times in a row it was found at the first try. */
  level: z.number(),
  /** When it's to review again (ms), and when last played. */
  due: z.number(),
  last: z.number(),
});

export type Entry = z.infer<typeof EntrySchema>;

/** A position as practice meets it. */
export type Met = Pick<Entry, 'side' | 'moves' | 'name'>;

/** How a position went: missed, found after hints, or found at the first try. */
export type Grade = 'again' | 'hard' | 'good';

/** How a position found went. */
export type FoundGrade = Exclude<Grade, 'again'>;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** When a position found comes back, by its level: the last interval repeats. */
const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120];

/** The level from which a position is known, and mastered. */
export const KNOWN_LEVEL = 3;
export const MASTERED_LEVEL = 5;

/** The most kept: the positions played the longest ago go first. */
const MAX_ENTRIES = 3000;

export const entryKey = ({ side, moves }: Pick<Entry, 'side' | 'moves'>): string =>
  `${side}|${moves.join(' ')}`;

const fresh = (met: Met): Entry => ({
  ...met,
  answers: [],
  seen: 0,
  missed: 0,
  level: 0,
  due: 0,
  last: 0,
});

/** The repertoire with the entry of `met` changed by `change`, the newest last. */
function withEntry(entries: readonly Entry[], met: Met, change: (entry: Entry) => Entry): Entry[] {
  const key = entryKey(met);
  const entry = entries.find(each => entryKey(each) === key) ?? fresh(met);
  const others = entries.filter(each => entryKey(each) !== key);
  return [...others, change({ ...entry, name: met.name || entry.name })].slice(-MAX_ENTRIES);
}

const intervalAt = (level: number): number =>
  (INTERVALS_DAYS[Math.min(level, INTERVALS_DAYS.length - 1)] ?? 1) * DAY_MS;

/** The repertoire once `met` is missed: to review now, from the first level. */
export const withMiss = (entries: readonly Entry[], met: Met, now: number): Entry[] =>
  withEntry(entries, met, entry => ({
    ...entry,
    seen: entry.seen + 1,
    missed: entry.missed + 1,
    level: 0,
    due: now,
    last: now,
  }));

/**
 * The repertoire once `answer` is found from `met`: at the first try, it comes
 * back later each time; after hints, as soon as at its level.
 */
export function withFound(
  entries: readonly Entry[],
  met: Met,
  { answer, grade, now }: { answer: string; grade: FoundGrade; now: number },
): Entry[] {
  return withEntry(entries, met, entry => {
    const answers = entry.answers.includes(answer) ? entry.answers : [...entry.answers, answer];
    const level = grade === 'good' ? entry.level + 1 : entry.level;
    return {
      ...entry,
      answers,
      seen: entry.seen + 1,
      level,
      due: now + intervalAt(Math.max(level - 1, 0)),
      last: now,
    };
  });
}

/** The repertoire with `answer` as the move its repertoire plays from `met`: learned anew. */
export const withPick = (
  entries: readonly Entry[],
  met: Met,
  { answer, now }: { answer: string; now: number },
): Entry[] =>
  withEntry(entries, met, entry => ({
    ...entry,
    answers: [answer, ...entry.answers.filter(each => each !== answer)],
    level: 0,
    due: now + intervalAt(0),
    last: now,
  }));

/** The line `moves` goes through `prefix`'s position: it starts with its moves. */
export const goesThrough = (moves: readonly string[], prefix: readonly string[]): boolean =>
  prefix.length <= moves.length && prefix.every((san, i) => moves[i] === san);

/** The repertoire without the positions of `side` past `moves`: a line pruned. */
export const withoutLine = (
  entries: readonly Entry[],
  side: Color,
  moves: readonly string[],
): Entry[] => entries.filter(entry => !(entry.side === side && goesThrough(entry.moves, moves)));

/** The positions to review at `now`, of `side` or both, the longest due first. */
export const dueEntries = (entries: readonly Entry[], now: number, side?: Color): Entry[] =>
  entries
    .filter(entry => (!side || entry.side === side) && entry.due > 0 && entry.due <= now)
    .toSorted((first, second) => first.due - second.due);

/** Both copies as one: each position as it was last played, this one's on a tie. */
export function mergedEntries(own: readonly Entry[], other: readonly Entry[]): Entry[] {
  const byKey = new Map(own.map(entry => [entryKey(entry), entry]));
  for (const entry of other) {
    const kept = byKey.get(entryKey(entry));
    if (!kept || entry.last > kept.last) byKey.set(entryKey(entry), entry);
  }
  return [...byKey.values()].toSorted((first, second) => first.last - second.last);
}

let kept: readonly Entry[] | null = null;
let byKey: ReadonlyMap<string, Entry> | null = null;

/** The repertoire kept, read once a visit. */
export function storedRepertoire(): readonly Entry[] {
  if (kept) return kept;
  try {
    kept = readStoredJson(StorageKey.practiceRepertoire, z.array(EntrySchema)) ?? [];
  } catch {
    kept = [];
  }
  return kept;
}

/** The kept position of `side` after `moves`, if met. */
export function entryAt(side: Color, moves: readonly string[]): Entry | null {
  byKey ??= new Map(storedRepertoire().map(entry => [entryKey(entry), entry]));
  return byKey.get(entryKey({ side, moves: [...moves] })) ?? null;
}

/** The opening a line has reached: the name of its last position met. */
export function nameAlong(side: Color, moves: readonly string[]): string {
  for (let length = moves.length; length >= 0; length--) {
    const name = entryAt(side, moves.slice(0, length))?.name;
    if (name) return name;
  }
  return '';
}

export function keepRepertoire(entries: readonly Entry[]): void {
  kept = entries;
  byKey = null;
  writeStoredJson(StorageKey.practiceRepertoire, entries);
}
