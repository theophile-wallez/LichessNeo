import { describe, expect, it } from 'vitest';
import { turned } from './coach.ts';

describe('turning the coach’s tips', () => {
  it('goes on or back, round the ends', () => {
    expect(turned(0, 'next', 4)).toBe(1);
    expect(turned(3, 'next', 4)).toBe(0);
    expect(turned(1, 'back', 4)).toBe(0);
    expect(turned(0, 'back', 4)).toBe(3);
  });
});
