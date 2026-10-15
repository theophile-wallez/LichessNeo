import { describe, expect, it } from 'vitest';
import { bareTurn, blackIndex, foldOf, foldState, worstClass } from './variation-folds.ts';

describe('folds', () => {
  it('folds a run only when it hides four moves or more', () => {
    expect(foldOf(6)).toBeNull();
    expect(foldOf(7)).toEqual({ start: 2, end: 6 });
    expect(foldOf(12)).toEqual({ start: 2, end: 11 });
  });

  it('keeps the first two moves and the last, the pill in between', () => {
    const fold = foldOf(8);
    const states = Array.from({ length: 8 }, (_, i) => foldState(fold, i));
    expect(states).toEqual([null, null, 'pill', 'hidden', 'hidden', 'hidden', 'hidden', null]);
    expect(foldState(null, 3)).toBeNull();
  });
});

describe('move numbers', () => {
  it("gives a black move its number from the white move's", () => {
    expect(blackIndex('56.')).toBe('56...');
    expect(blackIndex('56...')).toBeNull();
  });

  it("takes a black move's number without its dots", () => {
    expect(bareTurn('6...')).toBe('6');
    expect(bareTurn('6.')).toBeNull();
  });
});

describe('a branch’s costliest move', () => {
  it('ranks a blunder over a miss over a mistake, and ignores the rest', () => {
    expect(worstClass(['good', 'mistake', 'blunder', 'miss'])).toBe('blunder');
    expect(worstClass(['mistake', 'miss'])).toBe('miss');
    expect(worstClass(['inaccuracy', 'active'])).toBeNull();
  });
});
