import type { Color } from '#shared/chess/types.ts';
import { chapterOf } from './chapters.ts';
import { type Entry, goesThrough, MASTERED_LEVEL } from './repertoire.ts';

// How well the user knows a line or an opening, from its positions' levels:
// new before any is met, then learning, known, mastered as they come back
// found at the first try, further apart each time.

export type Mastery = 'new' | 'learning' | 'known' | 'mastered';

export const MASTERIES: readonly Mastery[] = ['new', 'learning', 'known', 'mastered'];

export interface MasteryOf {
  readonly mastery: Mastery;
  /** From 0 to 1: its positions' levels, up to the mastered one's. */
  readonly progress: number;
  readonly positions: number;
  /** The share of the moves found at the first try, from 0 to 1. */
  readonly found: number;
}

const KNOWN_PROGRESS = 0.45;
const MASTERED_PROGRESS = 0.8;
/** Fewer positions than this aren't an opening mastered, however well known. */
const MASTERED_POSITIONS = 5;

/** How well `entries` are known. */
export function masteryOf(entries: readonly Entry[]): MasteryOf {
  const positions = entries.length;
  const seen = entries.reduce((sum, entry) => sum + entry.seen, 0);
  const missed = entries.reduce((sum, entry) => sum + entry.missed, 0);
  const found = seen > 0 ? (seen - missed) / seen : 0;
  if (positions === 0) return { mastery: 'new', progress: 0, positions, found };
  const levels = entries.reduce(
    (sum, entry) => sum + Math.min(entry.level, MASTERED_LEVEL) / MASTERED_LEVEL,
    0,
  );
  const progress = levels / positions;
  let mastery: Mastery = 'learning';
  if (progress >= MASTERED_PROGRESS && positions >= MASTERED_POSITIONS) mastery = 'mastered';
  else if (progress >= KNOWN_PROGRESS) mastery = 'known';
  return { mastery, progress, positions, found };
}

/** How well the user knows the line `moves` as `side`: the positions past it. */
export const lineMastery = (
  entries: readonly Entry[],
  side: Color,
  moves: readonly string[],
): MasteryOf =>
  masteryOf(entries.filter(entry => entry.side === side && goesThrough(entry.moves, moves)));

/** How well the user knows the opening `name` belongs to, as `side`. */
export const openingMastery = (entries: readonly Entry[], side: Color, name: string): MasteryOf =>
  masteryOf(
    entries.filter(entry => entry.side === side && chapterOf(entry.name) === chapterOf(name)),
  );
