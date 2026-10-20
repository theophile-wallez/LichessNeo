import { describe, expect, it } from 'vitest';
import { createTakePicker, takesForReach } from './takes.ts';

// Each call answers the next of `values`, over and over.
function cycling(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('takesForReach', () => {
  it('gives each reach from two squares to seven its own group, shortest first', () => {
    expect([2, 3, 4, 5, 6, 7].map(reach => takesForReach(18, reach))).toEqual([
      { first: 0, end: 3 },
      { first: 3, end: 6 },
      { first: 6, end: 9 },
      { first: 9, end: 12 },
      { first: 12, end: 15 },
      { first: 15, end: 18 },
    ]);
  });

  it('gives a reach past either end the nearest group', () => {
    expect(takesForReach(18, 1)).toEqual({ first: 0, end: 3 });
    expect(takesForReach(18, 9)).toEqual({ first: 15, end: 18 });
  });

  it('gives at least one take to each reach when there are fewer takes than reaches', () => {
    expect(takesForReach(1, 7)).toEqual({ first: 0, end: 1 });
    expect(takesForReach(3, 2)).toEqual({ first: 0, end: 1 });
    expect(takesForReach(3, 7)).toEqual({ first: 2, end: 3 });
  });
});

describe('createTakePicker', () => {
  it('picks among all the takes, but never the one just played', () => {
    const pick = createTakePicker(cycling(0));
    expect([1, 2, 3, 4].map(() => pick('capture', 3))).toEqual([0, 1, 0, 1]);
  });

  it('remembers each sound’s last take apart', () => {
    const pick = createTakePicker(cycling(0));
    expect(pick('capture', 3)).toBe(0);
    expect(pick('castle', 3)).toBe(0);
    expect(pick('capture', 3)).toBe(1);
  });

  it('plays a sound’s only take every time', () => {
    const pick = createTakePicker(cycling(0.5));
    expect([pick('notify', 1), pick('notify', 1)]).toEqual([0, 0]);
  });

  it('picks a slide’s take in its reach’s group', () => {
    const pick = createTakePicker(cycling(0, 0.99));
    expect([pick('move-slide', 18, 7), pick('move-slide', 18, 7)]).toEqual([15, 17]);
    expect(pick('move-slide', 18, 2)).toBe(0);
  });
});
