import type { Character } from './character.ts';
import { cloudGeometry, weather } from './cloud-parts.ts';

// A little cloud: soft puffs of white fluff around a round face, floating with
// nothing to stand on, two tiny arms. It rains a little when it's sad.

export const cloud: Character = {
  name: 'Nuage',
  skin: 'clay',
  colors: { coat: '#e8eeff', front: '#ffffff', accent: '#ff9fb5' },
  frontMask: [0.55, 0.8],
  stripes: [0, 0, 0],
  body: {
    geometry: () => cloudGeometry(),
    surface: () => cloudGeometry(40),
    bottom: -0.79,
    fur: 0.05,
  },
  face: {
    center: [0, 0.04],
    size: [0.5, 0.36],
    slide: { x: [-0.6, 0.6], y: [-0.5, 0.6] },
    eyes: { x: 0.24, y: 0.1, size: 1.4 },
    brows: { y: 0.24, color: '#7f8fb8' },
    nose: null,
    mouth: { y: -0.04, scale: 1.05 },
    cheeks: { x: 0.4, y: -0.02 },
  },
  ears: null,
  arms: { position: [0.84, -0.24, 0.24], scale: 0.55, pads: null },
  feet: null,
  hover: 0.35,
  bust: -0.3,
  extras: weather,
};
