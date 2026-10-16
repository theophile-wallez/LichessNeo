import { describe, expect, it } from 'vitest';
import { meltedMin, profileRadius } from './shapes.ts';

describe('meltedMin', () => {
  it('is the nearer of two distances far apart, and rounds the crease where they meet', () => {
    expect(meltedMin(0.2, 1, 0.1)).toBe(0.2);
    expect(meltedMin(0.5, 0.5, 0.2)).toBeCloseTo(0.45, 6);
    expect(meltedMin(0.5, 0.55, 0.2)).toBeLessThan(0.5);
  });
});

describe('profileRadius', () => {
  const side = [
    [1, -1],
    [0.8, 0],
    [0.2, 1],
  ] as const;

  it('reads a profile’s points, straight between them, and holds past its ends', () => {
    expect(profileRadius(side, 0)).toBe(0.8);
    expect(profileRadius(side, 0.5)).toBeCloseTo(0.5, 6);
    expect(profileRadius(side, -2)).toBe(1);
    expect(profileRadius(side, 2)).toBe(0.2);
  });
});
