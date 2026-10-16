import { describe, expect, it } from 'vitest';
import { countdown, isThrown, placements, swipeOffset } from './stack.ts';

const sizes = [
  { width: 200, height: 46 },
  { width: 300, height: 60 },
  { width: 250, height: 46 },
  { width: 180, height: 46 },
];

describe('placements', () => {
  it('peeks the toasts behind out over the front one, at its size, collapsed', () => {
    const places = placements(sizes, false);
    expect(places.map(({ y }) => y)).toEqual([-0, -10, -20, -30]);
    expect(places.map(({ scale }) => scale)).toEqual([1, 0.95, 0.9, 0.85]);
    expect(places.every(({ size }) => size === sizes[0])).toBe(true);
  });

  it('spreads them out at their own sizes, expanded', () => {
    const places = placements(sizes, true);
    expect(places.map(({ y }) => y)).toEqual([-0, -58, -130, -188]);
    expect(places.map(({ scale }) => scale)).toEqual([1, 1, 1, 1]);
    expect(places.map(({ size }) => size)).toEqual(sizes);
  });

  it('hides all but the three newest', () => {
    expect(placements(sizes, true).map(({ hidden }) => hidden)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });
});

describe('swipeOffset', () => {
  it('follows the pointer sideways and down', () => {
    expect(swipeOffset('x', -80)).toBe(-80);
    expect(swipeOffset('y', 30)).toBe(30);
  });

  it('barely gives upwards', () => {
    expect(swipeOffset('y', -40)).toBeCloseTo(-11.43, 2);
    expect(swipeOffset('y', -400)).toBeGreaterThan(-20);
  });
});

describe('isThrown', () => {
  it('throws a toast swiped far enough, or fast enough', () => {
    expect(isThrown('x', -45, 1000)).toBe(true);
    expect(isThrown('y', 20, 100)).toBe(true);
    expect(isThrown('x', 20, 400)).toBe(false);
  });

  it('never throws one swiped up', () => {
    expect(isThrown('y', -60, 50)).toBe(false);
  });
});

describe('countdown', () => {
  it('reads as a clock, rounded up to the second', () => {
    expect(countdown(58_200)).toBe('0:59');
    expect(countdown(725_000)).toBe('12:05');
    expect(countdown(3_723_000)).toBe('1:02:03');
  });

  it('stops at zero', () => {
    expect(countdown(-5000)).toBe('0:00');
  });
});
