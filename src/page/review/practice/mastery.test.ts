import { describe, expect, it } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import { lineMastery, masteryOf, openingMastery } from './mastery.ts';

const atLevels = (levels: readonly number[], name = 'Italian Game') =>
  levels.map((level, i) => entry({ moves: ['e4', `m${i}`], level, name }));

describe('masteryOf', () => {
  it('is new before any position is met', () => {
    expect(masteryOf([])).toEqual({ mastery: 'new', progress: 0, positions: 0, found: 0 });
  });

  it('grows from learning to known with the positions’ levels', () => {
    expect(masteryOf(atLevels([0, 1])).mastery).toBe('learning');
    expect(masteryOf(atLevels([2, 3])).progress).toBe(0.5);
    expect(masteryOf(atLevels([2, 3])).mastery).toBe('known');
    // A level past the mastered one counts as it.
    expect(masteryOf(atLevels([9])).progress).toBe(1);
  });

  it('is mastered only over enough positions', () => {
    expect(masteryOf(atLevels([5, 5, 5, 5])).mastery).toBe('known');
    expect(masteryOf(atLevels([5, 5, 5, 5, 4])).mastery).toBe('mastered');
    expect(masteryOf(atLevels([5, 5, 5, 1, 1])).mastery).toBe('known');
  });

  it('counts the share of moves found at the first try', () => {
    const entries = [
      entry({ moves: [], seen: 6, missed: 1 }),
      entry({ moves: ['e4'], seen: 4, missed: 1 }),
    ];
    expect(masteryOf(entries).found).toBe(0.8);
    expect(masteryOf([entry({ moves: [], seen: 0 })]).found).toBe(0);
  });
});

describe('a line’s and an opening’s mastery', () => {
  const entries = [
    ...atLevels([5, 5, 5, 5, 5], 'Italian Game: Giuoco Piano'),
    entry({ moves: ['d4'], level: 0, name: 'Italian Game' }),
    entry({ side: 'black', moves: ['e4', 'm0'], level: 0, name: 'Italian Game' }),
  ];

  it('reads the positions of the side past the line', () => {
    expect(lineMastery(entries, 'white', ['e4']).positions).toBe(5);
    expect(lineMastery(entries, 'white', ['e4']).mastery).toBe('mastered');
    expect(lineMastery(entries, 'white', []).positions).toBe(6);
    expect(lineMastery(entries, 'black', ['d4']).mastery).toBe('new');
  });

  it('reads the positions of the opening’s family', () => {
    const italian = openingMastery(entries, 'white', 'Italian Game: Evans Gambit');
    expect(italian.positions).toBe(6);
    expect(italian.mastery).toBe('mastered');
    expect(openingMastery(entries, 'black', 'Italian Game').positions).toBe(1);
  });
});
