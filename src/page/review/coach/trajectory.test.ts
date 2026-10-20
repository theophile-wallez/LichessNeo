import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en } from '#page/review/i18n/en.ts';
import { advantageName, toldLevel, trajectory } from './trajectory.ts';

const cp = (whiteWinChance: number): PositionRecord => ({
  cp: 0,
  whiteWinChance,
  secondLineWinChance: null,
  best: null,
});

const mate = (moves: number): PositionRecord => ({
  mate: moves,
  whiteWinChance: moves > 0 ? 100 : 0,
  secondLineWinChance: null,
  best: null,
});

/** What the coach says of the move from `before` to `after`, its first way. */
const told = (before: PositionRecord, after: PositionRecord): string =>
  trajectory({ before, after, mover: 'white', seed: 0 }, en);

describe('toldLevel', () => {
  it('tells a mate it’s sure of as a mate, a longer one as a winning position', () => {
    expect([mate(3), mate(5), mate(6), mate(-9), mate(-2)].map(toldLevel)).toEqual([
      4, 4, 3, -3, -4,
    ]);
  });

  it('tells a score by its win chance', () => {
    expect([cp(50), cp(75), cp(95), cp(5)].map(toldLevel)).toEqual([0, 2, 3, -3]);
  });
});

describe('advantageName', () => {
  it('counts a mate only when sure of its moves', () => {
    expect(advantageName(4, mate(1), en)).toBe('a mate in one');
    expect(advantageName(4, mate(-3), en)).toBe('a mate in 3');
    expect(advantageName(4, mate(8), en)).toBe('a forced mate');
  });
});

describe('trajectory', () => {
  it('says a mate come on the board, in its moves when sure of them', () => {
    expect(told(cp(95), mate(2))).toBe(en.trajectory.mates('white', 2)[0]);
    expect(told(cp(50), mate(-1))).toBe(en.trajectory.mates('black', 1)[0]);
  });

  it('says nothing new of a long mate after a winning position', () => {
    expect(told(cp(95), mate(9))).toBe(
      en.trajectory.stillAhead({ side: 'white', advantage: 'a winning position' })[0],
    );
  });
});
