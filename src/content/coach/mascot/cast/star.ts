import type { Character } from './character.ts';
import { starGeometry, twinkles, type StarShape } from './star-parts.ts';

// A little star: plump and soft as a cushion, its points rounded off, standing
// on its two lower points with its face in the middle. It twinkles when pleased.

const SHAPE: StarShape = {
  points: 5,
  outer: 1.08,
  inner: 0.52,
  round: 0.24,
  melt: 0.3,
  depth: 0.6,
};

export const star: Character = {
  name: 'Étoile',
  skin: 'metal',
  colors: { coat: '#ffb62e', front: '#ffd65c', accent: '#ff9b5e' },
  frontMask: [0.7, 0.7],
  stripes: [0, 0, 0],
  body: {
    geometry: () => starGeometry(SHAPE),
    surface: () => starGeometry(SHAPE, 40),
    bottom: -0.92,
    fur: 0.04,
  },
  face: {
    center: [0, 0.05],
    size: [0.46, 0.34],
    slide: { x: [-0.5, 0.5], y: [-0.4, 0.5] },
    eyes: { x: 0.21, y: 0.12, size: 1.35 },
    brows: { y: 0.26, color: '#b0661c' },
    nose: null,
    mouth: { y: -0.03, scale: 1 },
    cheeks: { x: 0.36, y: 0 },
  },
  ears: null,
  arms: null,
  feet: null,
  bust: -0.45,
  extras: twinkles,
};
