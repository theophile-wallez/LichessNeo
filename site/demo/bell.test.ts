import { describe, expect, it } from 'vitest';
import { bellArea, bellPaths } from './bell.ts';

const BELL = { rating: 1500, spread: 200, scale: 3000, height: 40 };

/** The heights of a path's points, the box's top 0. */
const heights = (path: string): number[] =>
  [...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(([, , y]) => Number(y));

describe('the bell curve', () => {
  it('peaks at the rating and rests on the box’s bottom far from it', () => {
    const points = heights(bellArea(BELL, 1500, 1500));
    expect(Math.min(...points)).toBe(0);
    expect(heights(bellArea(BELL, 0, 0))[1]).toBeCloseTo(40, 0);
  });

  it('holds the middle half within the spread either side', () => {
    const { middle } = bellPaths(BELL);
    expect(middle.startsWith('M43.333 40')).toBe(true);
    expect(middle.endsWith('L56.667 40 Z')).toBe(true);
  });

  it('is cut at the scale’s ends', () => {
    const { whole } = bellPaths({ ...BELL, rating: 2900 });
    expect(whole.endsWith('L100.000 40 Z')).toBe(true);
    expect(bellPaths({ ...BELL, rating: 100 }).whole.startsWith('M0.000 40')).toBe(true);
  });
});
