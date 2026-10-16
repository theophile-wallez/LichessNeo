import { describe, expect, it } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { createFurLook } from '#content/coach/mascot/fur/fur.ts';
import { Mascot } from '#content/coach/mascot/rig/rig.ts';
import { slime } from './slime.ts';

const mascot = new Mascot(slime, createFurLook(slime.colors, slime.frontMask, slime.stripes));

function play(mood: CoachMood, seconds: number): void {
  mascot.setMood(mood);
  for (let time = 0; time < seconds; time += 1 / 30) mascot.update(1 / 30);
}

describe('the slime', () => {
  it('slumps into a puddle when sad, and stands up again', () => {
    play('neutral', 3);
    const standing = mascot.body.scale.y;
    play('sad', 3);
    expect(mascot.body.scale.y).toBeLessThan(standing * 0.85);
    expect(mascot.body.scale.x).toBeGreaterThan(1.08);
    play('neutral', 4);
    expect(mascot.body.scale.y).toBeCloseTo(standing, 1);
  });

  it('wobbles as its mood changes, then settles', () => {
    play('neutral', 3);
    const heights: number[] = [];
    mascot.setMood('surprise');
    for (let frame = 0; frame < 30; frame++) {
      mascot.update(1 / 30);
      heights.push(mascot.body.scale.y);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.01);
    play('surprise', 4);
    expect(mascot.body.scale.y).toBeCloseTo(1, 2);
  });
});
