import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import { blockStorage } from '#shared/testing/storage.ts';
import {
  DAY_MS,
  dueEntries,
  type Entry,
  entryKey,
  goesThrough,
  mergedEntries,
  type Met,
  withFound,
  withMiss,
  withoutLine,
  withPick,
} from './repertoire.ts';

const KEY = 'ln-ext-practice-repertoire';
const NOW = Date.UTC(2026, 9, 23, 9);
const ITALIAN: Met = { side: 'white', moves: ['e4', 'e5', 'Nf3', 'Nc6'], name: 'Italian Game' };

/** The repertoire after `grades` at the position, a day apart. */
function graded(grades: readonly ('again' | 'hard' | 'good')[]): Entry[] {
  let entries: Entry[] = [];
  for (const [i, grade] of grades.entries()) {
    const now = NOW + i * DAY_MS;
    entries =
      grade === 'again'
        ? withMiss(entries, ITALIAN, now)
        : withFound(entries, ITALIAN, { answer: 'Bc4', grade, now });
  }
  return entries;
}

describe('spaced repetition', () => {
  it('brings a position found at the first try back further apart each time', () => {
    const intervals = [1, 2, 3, 4, 5, 6, 7, 8].map(times => {
      const [found] = graded(Array.from({ length: times }, () => 'good'));
      return ((found?.due ?? 0) - (NOW + (times - 1) * DAY_MS)) / DAY_MS;
    });
    expect(intervals).toEqual([1, 3, 7, 14, 30, 60, 120, 120]);
  });

  it('counts what the user did there, the move found once', () => {
    const [found] = graded(['good', 'again', 'hard', 'good']);
    expect(found).toMatchObject({
      ...ITALIAN,
      answers: ['Bc4'],
      seen: 4,
      missed: 1,
      level: 1,
      last: NOW + 3 * DAY_MS,
      due: NOW + 4 * DAY_MS,
    });
  });

  it('takes a miss back to the first level, due at once', () => {
    const [missed] = graded(['good', 'good', 'good', 'again']);
    expect(missed).toMatchObject({ level: 0, missed: 1, due: NOW + 3 * DAY_MS });
  });

  it('brings a move found after hints back at its level', () => {
    const [hard] = graded(['good', 'good', 'hard']);
    expect(hard?.level).toBe(2);
    expect(hard?.due).toBe(NOW + 2 * DAY_MS + 3 * DAY_MS);
  });

  it('makes a move picked the repertoire’s, learned anew', () => {
    let entries = graded(['good', 'good']);
    entries = withFound(entries, ITALIAN, { answer: 'Bb5', grade: 'good', now: NOW });
    entries = withPick(entries, ITALIAN, { answer: 'Bb5', now: NOW });
    expect(entries[0]).toMatchObject({ answers: ['Bb5', 'Bc4'], level: 0, due: NOW + DAY_MS });
  });

  it('keeps a name it had, and moves the position changed last', () => {
    const other: Met = { side: 'black', moves: ['e4'], name: '' };
    let entries = withMiss([], ITALIAN, NOW);
    entries = withMiss(entries, other, NOW);
    entries = withMiss(entries, { ...ITALIAN, name: '' }, NOW);
    expect(entries.map(each => [entryKey(each), each.name])).toEqual([
      ['black|e4', ''],
      ['white|e4 e5 Nf3 Nc6', 'Italian Game'],
    ]);
  });

  it('keeps the positions played last, at most 3000', () => {
    let entries: Entry[] = Array.from({ length: 3000 }, (_, i) => entry({ moves: [`m${i}`] }));
    entries = withMiss(entries, ITALIAN, NOW);
    expect(entries).toHaveLength(3000);
    expect(entries[0]?.moves).toEqual(['m1']);
    expect(entries.at(-1)?.moves).toEqual(ITALIAN.moves);
  });
});

describe('lines and reviews', () => {
  const entries = [
    entry({ moves: ['e4', 'e5'], due: NOW - 10 }),
    entry({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], due: NOW - 20 }),
    entry({ moves: ['d4', 'd5'], due: NOW + 10 }),
    entry({ side: 'black', moves: ['e4'], due: NOW - 30 }),
    entry({ side: 'black', moves: ['d4'], due: 0 }),
  ];

  it('tells a line that goes through another', () => {
    expect(goesThrough(['e4', 'e5', 'Nf3'], ['e4', 'e5'])).toBe(true);
    expect(goesThrough(['e4', 'e5'], [])).toBe(true);
    expect(goesThrough(['e4'], ['e4', 'e5'])).toBe(false);
    expect(goesThrough(['e4', 'c5'], ['e4', 'e5'])).toBe(false);
  });

  it('prunes a line of one side', () => {
    const pruned = withoutLine(entries, 'white', ['e4']);
    expect(pruned.map(entryKey)).toEqual(['white|d4 d5', 'black|e4', 'black|d4']);
  });

  it('lists the positions due, the longest due first, of a side or both', () => {
    expect(dueEntries(entries, NOW).map(entryKey)).toEqual([
      'black|e4',
      'white|e4 e5 Nf3 Nc6',
      'white|e4 e5',
    ]);
    expect(dueEntries(entries, NOW, 'white')).toHaveLength(2);
    expect(dueEntries(entries, NOW + 10, 'white')).toHaveLength(3);
  });

  it('merges two copies, each position as last played', () => {
    const own = [entry({ moves: ['e4'], last: 5, seen: 1 }), entry({ moves: ['d4'], last: 9 })];
    const other = [
      entry({ moves: ['e4'], last: 7, seen: 3 }),
      entry({ moves: ['d4'], last: 9, seen: 8 }),
    ];
    const merged = mergedEntries(own, [...other, entry({ moves: ['c4'], last: 1 })]);
    expect(merged.map(each => [entryKey(each), each.seen])).toEqual([
      ['white|c4', 1],
      ['white|e4', 3],
      ['white|d4', 1],
    ]);
  });
});

/** The module as a new visit loads it, its copy not read yet. */
const fresh = async () => import('./repertoire.ts');

describe('the kept repertoire', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('reads the stored copy once, and finds a position in it', async () => {
    localStorage.setItem(KEY, JSON.stringify([entry({ moves: ['e4'], answers: ['e5'] })]));
    const repertoire = await fresh();
    expect(repertoire.storedRepertoire()).toHaveLength(1);
    expect(repertoire.entryAt('white', ['e4'])?.answers).toEqual(['e5']);
    expect(repertoire.entryAt('black', ['e4'])).toBeNull();
    localStorage.removeItem(KEY);
    expect(repertoire.storedRepertoire()).toHaveLength(1);
  });

  it('starts empty on a copy of another shape, or a blocked storage', async () => {
    localStorage.setItem(KEY, '[{"side":"red"}]');
    expect((await fresh()).storedRepertoire()).toEqual([]);
    vi.resetModules();
    blockStorage();
    expect((await fresh()).storedRepertoire()).toEqual([]);
  });

  it('keeps a new copy, and finds its positions at once', async () => {
    const repertoire = await fresh();
    expect(repertoire.entryAt('white', ['e4'])).toBeNull();
    repertoire.keepRepertoire([entry({ moves: ['e4', 'e5'], name: 'King’s Pawn' })]);
    expect(repertoire.entryAt('white', ['e4', 'e5'])?.name).toBe('King’s Pawn');
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toHaveLength(1);
  });

  it('names a line by the last position along it that has a name', async () => {
    const repertoire = await fresh();
    repertoire.keepRepertoire([
      entry({ moves: [], name: '' }),
      entry({ moves: ['e4', 'e5'], name: 'Open Game' }),
      entry({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], name: '' }),
    ]);
    expect(repertoire.nameAlong('white', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])).toBe(
      'Open Game',
    );
    expect(repertoire.nameAlong('white', ['e4'])).toBe('');
    expect(repertoire.nameAlong('black', ['e4', 'e5'])).toBe('');
  });
});
