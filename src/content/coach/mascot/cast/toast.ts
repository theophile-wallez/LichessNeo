import { MathUtils, type BufferGeometry } from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { Character } from './character.ts';
import { reshape, softBox } from './shapes.ts';

// A slice of bread: a flat square with a domed top that overhangs its sides.
// Its crust is the coat and its crumb the front, where the slice faces ahead.

const { smoothstep } = MathUtils;

const BOTTOM = -0.95;

function sliceGeometry(rows = 64): BufferGeometry {
  return reshape(softBox([0.8, 0.95, 0.36], 3.2, 0, rows), vertex => {
    const top = smoothstep(vertex.y, 0.35, 0.95);
    vertex.x *= 1 + 0.24 * top;
    // The dip between the dome's two lobes.
    vertex.y += 0.14 * top - 0.1 * top * Math.exp(-(vertex.x ** 2) / 0.04);
  });
}

export const toast: Character = {
  name: 'Tartine',
  skin: 'clay',
  colors: { coat: '#c98a4b', front: '#f6dfb2', accent: '#ff8a66' },
  frontMask: [0.86, 0.86],
  stripes: [0, 0, 0],
  body: {
    geometry: () => sliceGeometry(),
    surface: () => sliceGeometry(32),
    bottom: BOTTOM,
    fur: 0.04,
  },
  face: {
    center: [0, 0.35],
    size: [0.5, 0.36],
    slide: { x: [-0.6, 0.6], y: [-0.4, 0.9] },
    eyes: { x: 0.22, y: 0.42, size: 1.15 },
    brows: { y: 0.58, color: '#7a4a22' },
    nose: null,
    mouth: { y: 0.27, scale: 1.1 },
    cheeks: { x: 0.38, y: 0.32 },
  },
  ears: null,
  arms: { position: [0.82, -0.05, 0.02], scale: 0.62, pads: null },
  feet: { position: [0.32, 0.06, 0.1], scale: 0.75, mode: FurMode.coat },
  extras: () => null,
};
