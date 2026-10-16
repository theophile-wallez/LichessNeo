import { MultiplyBlending } from 'three';
import { describe, expect, it } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { type DrawnMesh, meshesIn } from '#shared/testing/meshes.ts';
import { createFurLook } from '#content/coach/mascot/fur/fur.ts';
import { Mascot } from '#content/coach/mascot/rig/rig.ts';
import { toast } from './toast.ts';

const mascot = new Mascot(toast, createFurLook(toast.colors, toast.frontMask, toast.stripes));

function play(mood: CoachMood, seconds: number): void {
  mascot.setMood(mood);
  for (let time = 0; time < seconds; time += 1 / 30) mascot.update(1 / 30);
}

/** The darkening laid over the slice as it burns. */
function burn(): DrawnMesh {
  const found = meshesIn(mascot.root).find(
    ({ material }) => material.blending === MultiplyBlending,
  );
  if (!found) throw new Error('no burn on the toast');
  return found;
}

describe('the toast', () => {
  it('stays golden while calm', () => {
    play('neutral', 2);
    expect(burn().mesh.visible).toBe(false);
  });

  it('burns while angry, its crust darkest, then turns golden again', () => {
    play('angry', 4);
    const { mesh, geometry } = burn();
    expect(mesh.visible).toBe(true);
    const colors = Array.from(geometry.getAttribute('color').array);
    expect(Math.min(...colors)).toBeLessThan(0.5);
    expect(Math.max(...colors)).toBeLessThan(1);
    play('happy', 8);
    expect(burn().mesh.visible).toBe(false);
  });
});
