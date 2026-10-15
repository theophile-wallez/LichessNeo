import type { Character } from './character.ts';
import { latheGeometry, type Profile } from './shapes.ts';
import { snailExtras } from './snail-parts.ts';

// A baby snail in glossy plastic: a gumdrop of a head carrying the face, big
// eyes, short stalks, and a big shell on its back, the spiral turned to the
// viewer.

// A gumdrop: wide at the bottom, its round top barely narrower.
const HEAD: Profile = [
  [0.001, -1],
  [0.58, -1],
  [0.7, -0.88],
  [0.7, -0.55],
  [0.63, -0.15],
  [0.65, 0.25],
  [0.57, 0.62],
  [0.36, 0.87],
  [0.001, 0.94],
];

export const snail: Character = {
  name: 'Escargot',
  skin: 'plastic',
  colors: { coat: '#bfe88a', front: '#e6f7c8', accent: '#ffab73' },
  frontMask: [0.5, 0.65],
  stripes: [0, 0, 0],
  body: {
    geometry: () => latheGeometry(HEAD),
    surface: () => latheGeometry(HEAD, 48),
    bottom: -1,
    fur: 0.05,
  },
  face: {
    center: [0, 0.3],
    size: [0.46, 0.34],
    slide: { x: [-0.5, 0.5], y: [-0.2, 0.85] },
    eyes: { x: 0.24, y: 0.38, size: 1.35, style: 'insect' },
    brows: { y: 0.56, color: '#4f7a2a' },
    nose: null,
    mouth: { y: 0.2, scale: 0.95 },
    cheeks: { x: 0.42, y: 0.24 },
  },
  ears: null,
  arms: null,
  feet: null,
  extras: snailExtras({
    shell: {
      position: [0.62, 0, -0.5],
      turn: -0.6,
      radius: 0.72,
      depth: 0.42,
      turns: 2.5,
      groove: '#c0673a',
      grooveWidth: 0.05,
    },
    stalks: { y: 0.8, spread: 0.22, lean: 0.35, length: 0.2, knob: 0.11 },
    foot: { position: [0.5, -0.85, -0.25], turn: -0.55, length: 1 },
  }),
};
