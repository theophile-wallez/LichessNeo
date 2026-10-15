import { MathUtils, type BufferGeometry } from 'three';
import type { Character } from './character.ts';
import { latheGeometry, reshape, type Profile } from './shapes.ts';

// A little ghost: a bell with a wavy hem, hollow underneath, that floats over
// the ground with nothing to stand on.

const { smoothstep } = MathUtils;

// Up from under the hem, out to its edge, then over the dome.
const PROFILE: Profile = [
  [0.001, -0.36],
  [0.5, -0.42],
  [0.74, -0.55],
  [0.79, -0.3],
  [0.77, 0.15],
  [0.68, 0.56],
  [0.47, 0.92],
  [0.2, 1.1],
  [0.001, 1.13],
];

const WAVES = 7;

function ghostGeometry(columns = 128): BufferGeometry {
  return reshape(latheGeometry(PROFILE, columns), vertex => {
    const hem = smoothstep(-vertex.y, 0.25, 0.55);
    vertex.y += 0.08 * hem * Math.sin(Math.atan2(vertex.x, vertex.z) * WAVES);
  });
}

export const ghost: Character = {
  name: 'Fantôme',
  skin: 'velvet',
  colors: { coat: '#e6e0ff', front: '#f6f3ff', accent: '#b9a8ff' },
  frontMask: [0.6, 0.8],
  stripes: [0, 0, 0],
  body: {
    geometry: () => ghostGeometry(),
    surface: () => ghostGeometry(48),
    bottom: -0.62,
    fur: 0.06,
  },
  face: {
    center: [0, 0.4],
    size: [0.46, 0.34],
    slide: { x: [-0.6, 0.6], y: [-0.1, 1] },
    eyes: { x: 0.22, y: 0.48, size: 1.2 },
    brows: { y: 0.63, color: '#6b5bb8' },
    nose: null,
    mouth: { y: 0.32, scale: 1.1 },
    cheeks: { x: 0.38, y: 0.36 },
  },
  ears: null,
  arms: { position: [0.72, 0.05, 0.08], scale: 0.6, pads: null },
  feet: null,
  hover: 0.4,
  extras: () => null,
};
