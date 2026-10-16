import { Color, SphereGeometry, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createFur, createFurLook, FurMode } from '#content/coach/mascot/fur/fur.ts';
import { Shell } from './shell.ts';

const COLORS = { coat: '#17b08a', front: '#ffffff', accent: '#ff9ccf' };
const ANGRY = { coat: '#d8322a', front: '#ffffff', accent: '#ff9ccf' };
const look = createFurLook(COLORS, [0, 0], [0, 0, 0]);
const geometry = new SphereGeometry(1, 8, 6);
const OPTIONS = { layers: 1, length: 0, mode: FurMode.coat } as const;

const colorOf = (mesh: Mesh): string =>
  'color' in mesh.material && mesh.material.color instanceof Color
    ? mesh.material.color.getHexString()
    : '';

/** Runs `shell` for `seconds`, a frame at a time. */
function run(shell: Shell, seconds: number): void {
  for (let time = 0; time < seconds; time += 1 / 60) shell.update(1 / 60);
}

describe('Shell', () => {
  it('eases into the colors a mood gives it, and back into its own', () => {
    const shell = new Shell(COLORS, 'clay', look, { angry: ANGRY });
    const coat = shell.mesh(geometry, OPTIONS);
    shell.show('angry');
    shell.update(1 / 60);
    expect(colorOf(coat)).not.toBe('d8322a');
    run(shell, 1);
    expect(colorOf(coat)).toBe('d8322a');
    shell.show('happy');
    run(shell, 1);
    expect(colorOf(coat)).toBe('17b08a');
  });

  it('keeps its own colors for a mood that gives none', () => {
    const shell = new Shell(COLORS, 'clay', look);
    const coat = shell.mesh(geometry, OPTIONS);
    shell.show('angry');
    run(shell, 1);
    expect(colorOf(coat)).toBe('17b08a');
  });

  it('paints a part in its own accent, the others in the character’s', () => {
    const shell = new Shell(COLORS, 'clay', look);
    const mane = shell.mesh(geometry, { ...OPTIONS, mode: FurMode.accent, accent: '#ecd3a4' });
    const nose = shell.mesh(geometry, { ...OPTIONS, mode: FurMode.accent });
    expect(colorOf(mane)).toBe('ecd3a4');
    expect(colorOf(nose)).toBe('ff9ccf');
  });
});

const accentOf = (uniform: unknown): string =>
  uniform instanceof Object && 'value' in uniform && uniform.value instanceof Color
    ? uniform.value.getHexString()
    : '';

describe('createFur', () => {
  it('gives a part its own accent, leaving the look the others share as it is', () => {
    const fur = createFur(geometry, look, { ...OPTIONS, mode: FurMode.accent, accent: '#ecd3a4' });
    const plain = createFur(geometry, look, { ...OPTIONS, mode: FurMode.accent });
    expect(accentOf(fur.material.uniforms['uAccent'])).toBe('ecd3a4');
    expect(accentOf(plain.material.uniforms['uAccent'])).toBe('ff9ccf');
    expect(look.uAccent.value.getHexString()).toBe('ff9ccf');
  });
});
