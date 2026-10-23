import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockStorage } from '#shared/testing/storage.ts';

const KEY = 'ln-ext-practice-progress';

/** Local noon of a day of October 2026. */
const october = (day: number): number => new Date(2026, 9, day, 12).getTime();

/** The module as a new visit loads it, its record not read yet. */
const fresh = async () => import('./progress.ts');

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('days', () => {
  it('names a local day', async () => {
    const { dayKey } = await fresh();
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 9, 23, 0, 1).getTime())).toBe('2026-10-23');
  });

  it('counts the moves practiced each day, and keeps them', async () => {
    const progress = await fresh();
    expect(progress.noteDay(october(23))).toBe(1);
    expect(progress.noteDay(october(23) + 3600_000)).toBe(2);
    expect(progress.noteDay(october(24))).toBe(1);
    expect(progress.dayCount(october(23))).toBe(2);
    expect(progress.dayCount(october(22))).toBe(0);
    vi.resetModules();
    expect((await fresh()).dayCount(october(23))).toBe(2);
  });

  it('keeps the last 120 days', async () => {
    const days = Object.fromEntries(
      Array.from({ length: 130 }, (_, i) => [`2026-01-${String(i).padStart(3, '0')}`, 1]),
    );
    localStorage.setItem(
      KEY,
      JSON.stringify({ days, best: { blitz: 0, quiz: 0 }, depths: {}, favorites: [] }),
    );
    const progress = await fresh();
    progress.noteDay(october(23));
    const kept = Object.keys(progress.storedProgress().days);
    expect(kept).toHaveLength(121);
    expect(kept).not.toContain('2026-01-000');
    expect(kept).toContain('2026-01-129');
  });

  it('counts the days in a row the goal was met, today’s once it is', async () => {
    const progress = await fresh();
    for (const day of [18, 20, 21, 22])
      for (let move = 0; move < 3; move++) progress.noteDay(october(day));
    progress.noteDay(october(23));
    expect(progress.dayStreak(3, october(23))).toBe(3);
    progress.noteDay(october(23));
    progress.noteDay(october(23));
    expect(progress.dayStreak(3, october(23))).toBe(4);
    expect(progress.dayStreak(4, october(23))).toBe(0);
    expect(progress.dayStreak(3, october(25))).toBe(0);
  });

  it('counts across a month’s end', async () => {
    const progress = await fresh();
    progress.noteDay(new Date(2026, 9, 31, 12).getTime());
    progress.noteDay(new Date(2026, 10, 1, 12).getTime());
    expect(progress.dayStreak(1, new Date(2026, 10, 1, 20).getTime())).toBe(2);
  });
});

describe('scores, depths and favorites', () => {
  it('keeps the best score of each challenge', async () => {
    const progress = await fresh();
    expect(progress.bestOf('blitz')).toBe(0);
    expect(progress.noteScore('blitz', 12)).toBe(true);
    expect(progress.noteScore('blitz', 12)).toBe(false);
    expect(progress.noteScore('blitz', 9)).toBe(false);
    expect(progress.noteScore('quiz', 7)).toBe(true);
    expect([progress.bestOf('blitz'), progress.bestOf('quiz')]).toEqual([12, 7]);
  });

  it('keeps how deep each opening’s lines go', async () => {
    const progress = await fresh();
    expect(progress.depthOf('Italian Game', 4)).toBe(4);
    progress.keepDepth('Italian Game', 6);
    expect(progress.depthOf('Italian Game', 4)).toBe(6);
    expect(progress.depthOf('Ruy Lopez', 4)).toBe(4);
  });

  it('stars a line, and takes the star off', async () => {
    const progress = await fresh();
    progress.toggleFavorite('white|e4 e5');
    expect(progress.isFavorite('white|e4 e5')).toBe(true);
    expect(progress.isFavorite('black|e4 e5')).toBe(false);
    progress.toggleFavorite('white|e4 e5');
    expect(progress.isFavorite('white|e4 e5')).toBe(false);
  });

  it('starts afresh on a record of another shape, or a blocked storage', async () => {
    localStorage.setItem(KEY, '{"days":[]}');
    expect((await fresh()).storedProgress()).toEqual({
      days: {},
      best: { blitz: 0, quiz: 0 },
      depths: {},
      favorites: [],
    });
    vi.resetModules();
    blockStorage();
    const progress = await fresh();
    expect(progress.dayCount(october(23))).toBe(0);
    // Its writes are lost, but the visit's count goes on.
    expect(progress.noteDay(october(23))).toBe(1);
  });
});
