import { describe, expect, it } from 'vitest';
import { medalOf, medals, stepsWon } from './medals-model.ts';
import type { ProfileUser } from './user.ts';

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 9, 11);

// A player's API answer, cut to what the medals read.
const user = (overrides: Partial<ProfileUser> = {}): ProfileUser => ({
  username: 'Eresy',
  createdAt: NOW - 7.5 * YEAR_MS,
  count: { all: 1248, win: 620 },
  playTime: { total: 112 * 3600 + 1800 },
  perfs: {
    blitz: { games: 25, rating: 1584, prov: true },
    rapid: { games: 78, rating: 1673 },
    bullet: { games: 32, rating: 1413 },
    puzzle: { games: 40, rating: 2202 },
    chess960: { games: 12, rating: 1500 },
    atomic: { games: 3, rating: 1500 },
    storm: { runs: 4, score: 41 },
  },
  ...overrides,
});

describe('a medal', () => {
  it('is won in the metal of the last step passed, with how far to the next', () => {
    expect(medalOf('games', user(), NOW)).toEqual({
      id: 'games',
      value: 1248,
      metal: 'silver',
      next: 5000,
      progress: 248 / 4000,
    });
  });

  it('is not won before its first step, and counts toward it', () => {
    expect(medalOf('puzzles', user(), NOW)).toMatchObject({
      metal: null,
      next: 100,
      progress: 0.4,
    });
  });

  it('is crystal past its last step, with nothing next', () => {
    const marathon = medalOf('marathon', user({ playTime: { total: 2400 * 3600 } }), NOW);
    expect(marathon).toMatchObject({ metal: 'crystal', next: null, progress: 1 });
  });

  it('counts whole years and hours only', () => {
    expect(medalOf('veteran', user(), NOW)).toMatchObject({ value: 7, metal: 'gold', next: 10 });
    expect(medalOf('marathon', user(), NOW)).toMatchObject({ value: 112, metal: 'silver' });
  });

  it('reads the best rating among the settled speeds only', () => {
    // Blitz is provisional, puzzles aren't a speed.
    expect(medalOf('peak', user(), NOW)).toMatchObject({ value: 1673, metal: 'bronze' });
  });

  it('counts a variant once it has ten games', () => {
    expect(medalOf('variants', user(), NOW)).toMatchObject({ value: 1, metal: 'bronze' });
  });

  it('reads nothing where the API says nothing', () => {
    const bare = user({ count: undefined, playTime: undefined, perfs: {} });
    for (const id of ['games', 'wins', 'peak', 'puzzles', 'streak', 'marathon'] as const)
      expect(medalOf(id, bare, NOW)).toMatchObject({ value: 0, metal: null });
  });
});

describe('the medals', () => {
  it('put the best metals first, then the ones nearest their first step', () => {
    expect(medals(user(), NOW).map(medal => medal.id)).toEqual([
      'veteran',
      'games',
      'wins',
      'storm',
      'marathon',
      'peak',
      'variants',
      'puzzles',
      'streak',
    ]);
  });

  it('count every step won over every family', () => {
    expect(stepsWon(medals(user(), NOW))).toEqual({ won: 13, of: 36 });
  });
});
