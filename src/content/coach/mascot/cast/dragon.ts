import type { Character } from './character.ts';
import { BODY_BOTTOM, bodyGeometry } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import { dragonExtras } from './dragon-parts.ts';

// A baby dragon: a chubby lilac egg with a butter belly, nubby horns, little
// wings that flap when it's thrilled, a tail with a heart at its tip, and a puff
// of smoke when it's cross.

export const dragon: Character = {
  name: 'Dragon',
  skin: 'clay',
  colors: { coat: '#b39af2', front: '#ffe9b8', accent: '#ff9fcf' },
  // The belly only: the face stays lilac.
  frontMask: [0.68, 3],
  stripes: [0, 0, 0],
  body: {
    geometry: () => bodyGeometry(),
    surface: () => bodyGeometry(48, 36),
    bottom: BODY_BOTTOM,
    fur: 0.05,
  },
  face: {
    center: [0, 0.5],
    size: [0.46, 0.32],
    slide: { x: [-0.6, 0.6], y: [0.1, 1] },
    eyes: { x: 0.23, y: 0.6, size: 1.35 },
    brows: { y: 0.74, color: '#5b3fa8' },
    nose: { kind: 'nostrils', y: 0.49, size: 0.9 },
    mouth: { y: 0.41, scale: 1.15 },
    cheeks: { x: 0.37, y: 0.47 },
  },
  ears: null,
  arms: { position: [0.78, 0.04, 0.3], scale: 0.62, pads: null },
  feet: { position: [0.34, 0.06, 0.42], scale: 0.95, mode: FurMode.coat },
  extras: dragonExtras,
};
