import { describe, expect, it } from 'vitest';
import { arcStars } from './support-stars.ts';

const ARC = { count: 7, radius: 140, spread: 190, largest: 44, smallest: 20 };

describe('the Support page’s arc of stars', () => {
  it('puts the largest star right over the middle, the smallest at the ends', () => {
    const stars = arcStars(ARC);
    expect(stars).toHaveLength(7);
    expect(stars[3]).toEqual({ x: 0, y: -140, size: 44, tilt: 0, order: 0 });
    expect(stars[0]?.size).toBe(20);
    expect(stars[6]?.size).toBe(20);
  });

  it('mirrors each side, its stars tilted away from the middle', () => {
    const stars = arcStars(ARC);
    for (let i = 0; i < 3; i++) {
      const left = stars[i];
      const right = stars[6 - i];
      expect(left?.x).toBe(-(right?.x ?? 0));
      expect(left?.y).toBe(right?.y);
      expect(left?.tilt).toBe(-(right?.tilt ?? 0));
      expect(left?.order).toBe(3 - i);
    }
  });

  it('runs past the sides when it spans more than a half circle', () => {
    const [first] = arcStars(ARC);
    // 95° from the top: a little under the arc's center, beside the coach's head.
    expect(first?.y).toBeGreaterThan(0);
    expect(first?.x).toBe(-139);
  });

  it('keeps a single star on top', () => {
    expect(arcStars({ ...ARC, count: 1 })).toEqual([
      { x: 0, y: -140, size: 44, tilt: 0, order: 0 },
    ]);
  });
});
