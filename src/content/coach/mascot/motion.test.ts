import { describe, expect, it } from 'vitest';
import { easing } from './motion.ts';

describe('easing', () => {
  it('eases from 0 toward each frame’s target, as far whatever the frame rate', () => {
    const [fast, slow] = [easing(4), easing(4)];
    let [smooth, choppy] = [0, 0];
    for (let frame = 1; frame <= 60; frame++) smooth = fast(frame / 60, 1);
    for (let frame = 1; frame <= 10; frame++) choppy = slow(frame / 10, 1);
    expect(smooth).toBeCloseTo(1 - Math.exp(-4), 6);
    expect(choppy).toBeCloseTo(smooth, 6);
    expect(fast(3, 0)).toBeLessThan(0.01);
  });
});
