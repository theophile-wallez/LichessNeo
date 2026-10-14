import { describe, expect, it } from 'vitest';
import type { Square } from '#shared/chess/types.ts';
import { PULSE_END_MS } from './effects.ts';
import { createScene, type Light, type WaveStart } from './scene.ts';

const BLUE = { color: '#00f' };
const wave = (square: Square, spread: WaveStart['spread'] = 'wave'): WaveStart => ({
  square,
  spread,
  reach: 'short',
  paint: BLUE,
});

const squares = (lights: readonly Light[]): Square[] =>
  lights.map(light => light.square).toSorted();

describe('the backlit scene', () => {
  it('spreads a wave from its square, then goes dark and idle', () => {
    const scene = createScene();
    scene.wave(wave('e4'), 0);
    const early = scene.lights(100);
    expect(squares(early)).toContain('e4');
    expect(squares(early)).not.toContain('e6');
    expect(squares(scene.lights(250))).toContain('e6');
    expect(scene.busy(250)).toBe(true);
    expect(scene.lights(5000)).toEqual([]);
    expect(scene.busy(5000)).toBe(false);
  });

  it('lights a quiet move’s key alone', () => {
    const scene = createScene();
    scene.wave(wave('a1', 'key'), 0);
    for (const at of [50, 150, 300, 500]) expect(squares(scene.lights(at))).toEqual(['a1']);
  });

  it('paints a rainbow in a hue per direction', () => {
    const scene = createScene();
    scene.wave({ ...wave('d4'), paint: 'rainbow' }, 0);
    const lights = scene.lights(250);
    const hueOf = (square: Square): string | undefined =>
      lights.find(light => light.square === square)?.color;
    expect(hueOf('f4')).toMatch(/^hsl\(/);
    expect(hueOf('f4')).not.toBe(hueOf('b4'));
  });

  it('pulses a check in its own color, as long as the pulse lasts', () => {
    const scene = createScene();
    scene.pulse('e8', '#f00', 0);
    const lights = scene.lights(400);
    expect(lights).toHaveLength(1);
    expect(lights[0]).toMatchObject({ square: 'e8', color: '#f00' });
    expect(lights[0]?.level).toBeGreaterThan(0);
    expect(scene.busy(PULSE_END_MS - 1)).toBe(true);
    expect(scene.lights(PULSE_END_MS)).toEqual([]);
    expect(scene.busy(PULSE_END_MS)).toBe(false);
  });

  it('keeps only the latest waves when moves come fast', () => {
    const scene = createScene();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
    for (const [index, file] of files.entries()) scene.wave(wave(`${file}1`, 'key'), index);
    expect(squares(scene.lights(60))).toEqual(['c1', 'd1', 'e1', 'f1', 'g1', 'h1']);
  });

  it('lights the key under the pointer, and lets it fade once the pointer leaves', () => {
    const scene = createScene();
    scene.hover('c3', '#0f0', 0);
    expect(scene.busy(40)).toBe(true);
    const [lit] = scene.lights(100);
    expect(lit).toMatchObject({ square: 'c3', color: '#0f0' });
    expect(scene.busy(100)).toBe(false);
    scene.hover(null, '#0f0', 100);
    expect(scene.lights(300)[0]?.level).toBeLessThan(lit?.level ?? 0);
    expect(scene.lights(600)).toEqual([]);
    expect(scene.busy(600)).toBe(false);
  });
});
