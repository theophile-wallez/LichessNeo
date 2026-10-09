import { describe, expect, it } from 'vitest';
import { poolLabel, poolOfClock } from './pools.ts';

describe('pools', () => {
  it('names a pool as its buttons do, minutes alone without an increment', () => {
    expect([poolLabel('3+0'), poolLabel('3+2'), poolLabel('15+10')]).toEqual([
      '3 min',
      '3 + 2',
      '15 + 10',
    ]);
  });

  it("finds a game's pool from its clock in seconds, none for a custom one", () => {
    expect(poolOfClock(180, 2)).toBe('3+2');
    expect(poolOfClock(1800, 20)).toBe('30+20');
    expect(poolOfClock(240, 0)).toBeNull();
    expect(poolOfClock(45, 0)).toBeNull();
  });
});
