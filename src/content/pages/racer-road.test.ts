import { describe, expect, it } from 'vitest';
import { nextSpeed } from './racer-road.ts';

describe("the racer home's road", () => {
  it('gathers speed in under half a second, and loses it in under a second', () => {
    expect(nextSpeed(0, 1, 225)).toBeCloseTo(0.5);
    expect(nextSpeed(0, 1, 450)).toBe(1);
    expect(nextSpeed(1, 0, 450)).toBeCloseTo(0.5);
    expect(nextSpeed(1, 0, 900)).toBe(0);
  });

  it('never runs past where it heads, and turns back from where it is', () => {
    expect(nextSpeed(0.9, 1, 1000)).toBe(1);
    expect(nextSpeed(0.1, 0, 1000)).toBe(0);
    expect(nextSpeed(0.4, 1, 45)).toBeCloseTo(0.5);
  });
});
