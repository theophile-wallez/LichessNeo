import { ROBOT_COACH } from '#shared/coach.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import { antennae, eyeBumps, frogSurface, gills, tentacles, wings } from './appendages.ts';
import { cactus } from './cactus.ts';
import type { BodyLook, Character } from './character.ts';
import { ghost } from './ghost.ts';
import { mushroom } from './mushroom.ts';
import { rook } from './rook.ts';
import { snail } from './snail.ts';
import { toast } from './toast.ts';
import { collar, crest, tail, tailPlates, together } from './parts.ts';
import {
  BODY_BOTTOM,
  bodyGeometry,
  collarGeometry,
  pawnGeometry,
  pointedEarGeometry,
  tailGeometry,
} from './shapes.ts';

// The Game Review's coaches: the seven animals (1 to 7), the computer's robot (8, robot.ts),
// then the coaches in other shapes than the egg (9 to 14), each in its own file.

const EGG: BodyLook = {
  geometry: () => bodyGeometry(),
  surface: () => bodyGeometry(48, 36),
  bottom: BODY_BOTTOM,
  fur: 0.07,
};
const EGG_FACE = {
  center: [0, 0.5],
  size: [0.46, 0.32],
  slide: { x: [-0.6, 0.6], y: [0.1, 1] },
} as const;
const NO_STRIPES = [0, 0, 0] as const;

const pawn: Character = {
  name: 'Pion',
  skin: 'fur',
  colors: { coat: '#f1e9da', front: '#fbf7ef', accent: '#ff7a5c' },
  frontMask: [0.5, 0.86],
  stripes: NO_STRIPES,
  body: { geometry: () => pawnGeometry(), surface: () => pawnGeometry(48), bottom: -1, fur: 0.07 },
  face: {
    center: [0, 0.55],
    size: [0.5, 0.4],
    slide: { x: [-0.4, 0.4], y: [0.25, 0.95] },
    eyes: { x: 0.18, y: 0.6, size: 1.25 },
    brows: { y: 0.76, color: '#5a4636' },
    nose: null,
    mouth: { y: 0.45, scale: 1 },
    cheeks: { x: 0.3, y: 0.47 },
  },
  ears: null,
  arms: { position: [0.46, -0.15, 0.1], scale: 0.7, pads: null },
  feet: null,
  extras: rig => collar(rig, collarGeometry()),
};

const fennec: Character = {
  name: 'Fennec',
  skin: 'fur',
  colors: { coat: '#e9b679', front: '#fff4e4', accent: '#f2a99a' },
  frontMask: [0.5, 0.86],
  stripes: NO_STRIPES,
  body: EGG,
  face: {
    ...EGG_FACE,
    eyes: { x: 0.22, y: 0.57, size: 1.1 },
    brows: { y: 0.7, color: '#7a4a22' },
    nose: { kind: 'button', y: 0.47, size: 0.8 },
    mouth: { y: 0.39, scale: 0.95 },
    cheeks: null,
  },
  ears: {
    geometry: pointedEarGeometry,
    position: [0.36, 0.86, -0.08],
    tilt: 0.42,
    lift: 0,
    fur: 0.04,
    inner: true,
  },
  arms: { position: [0.8, 0.16, 0.24], scale: 1, pads: null },
  feet: { position: [0.32, 0.06, 0.42], scale: 0.85, mode: FurMode.front },
  extras: rig =>
    tail(rig, {
      geometry: tailGeometry({ length: 0.85, radius: 0.24, taper: 0.5 }),
      position: [0.55, -0.62, -0.35],
      rotation: [-0.35, 0, -1.3],
      tipFrom: 0.62,
      mode: FurMode.tail,
    }),
};

const dino: Character = {
  name: 'Dino',
  skin: 'fur',
  colors: { coat: '#5ccf9c', front: '#fff1b5', accent: '#ff8a66' },
  frontMask: [0.42, 0.9],
  stripes: NO_STRIPES,
  body: EGG,
  face: {
    ...EGG_FACE,
    eyes: { x: 0.24, y: 0.58, size: 1.2 },
    brows: { y: 0.72, color: '#1f6b4c' },
    nose: { kind: 'nostrils', y: 0.49, size: 1 },
    mouth: { y: 0.4, scale: 1.35 },
    cheeks: { x: 0.36, y: 0.45 },
  },
  ears: null,
  arms: { position: [0.78, 0.02, 0.3], scale: 0.6, pads: null },
  feet: { position: [0.34, 0.06, 0.42], scale: 0.95, mode: FurMode.coat },
  extras: rig => {
    crest(rig);
    const dinoTail = tail(rig, {
      geometry: tailGeometry({ length: 0.95, radius: 0.3, taper: 1.3 }),
      position: [-0.5, -0.7, -0.4],
      rotation: [-0.7, 0, 1.4],
    });
    tailPlates(rig, dinoTail.pivot, 0.95);
    return dinoTail;
  },
};

const axolotl: Character = {
  name: 'Axolotl',
  skin: 'fur',
  colors: { coat: '#ff8fbf', front: '#ffc7de', accent: '#d9307a' },
  frontMask: [0.55, 0.9],
  stripes: NO_STRIPES,
  body: EGG,
  face: {
    ...EGG_FACE,
    eyes: { x: 0.3, y: 0.6, size: 0.95 },
    brows: { y: 0.73, color: '#a3305e' },
    nose: null,
    mouth: { y: 0.43, scale: 1.7 },
    cheeks: { x: 0.43, y: 0.48 },
  },
  ears: null,
  arms: { position: [0.78, 0.05, 0.28], scale: 0.65, pads: null },
  feet: { position: [0.32, 0.06, 0.42], scale: 0.8, mode: FurMode.coat },
  extras: rig =>
    together(
      gills(rig),
      tail(rig, {
        geometry: tailGeometry({ length: 0.9, radius: 0.22, taper: 1.2 }),
        position: [0.45, -0.7, -0.45],
        rotation: [-0.6, 0, -1.35],
      }),
    ),
};

const frog: Character = {
  name: 'Grenouille',
  skin: 'fur',
  colors: { coat: '#7ad650', front: '#eef8b8', accent: '#ff6f91' },
  frontMask: [0.42, 0.9],
  stripes: NO_STRIPES,
  body: { ...EGG, surface: frogSurface },
  face: {
    center: [0, 0.62],
    size: [0.6, 0.36],
    slide: { x: [-0.65, 0.65], y: [0.1, 1.15] },
    eyes: { x: 0.3, y: 0.96, size: 1.35 },
    brows: { y: 1.12, color: '#2f6b1f' },
    nose: { kind: 'nostrils', y: 0.66, size: 0.9 },
    mouth: { y: 0.53, scale: 1.9 },
    cheeks: { x: 0.46, y: 0.58 },
  },
  ears: null,
  arms: { position: [0.8, 0.1, 0.26], scale: 0.8, pads: null },
  feet: { position: [0.36, 0.06, 0.45], scale: 1.1, mode: FurMode.coat },
  extras: eyeBumps,
};

const bee: Character = {
  name: 'Abeille',
  skin: 'fur',
  colors: { coat: '#ffc93c', front: '#ffe28c', accent: '#3b2a20' },
  frontMask: [0.5, 0.86],
  stripes: [2.6, -9, 0.26],
  body: EGG,
  face: {
    ...EGG_FACE,
    eyes: { x: 0.22, y: 0.58, size: 1.15 },
    brows: { y: 0.71, color: '#3b2a20' },
    nose: null,
    mouth: { y: 0.43, scale: 1.1 },
    cheeks: { x: 0.36, y: 0.47 },
  },
  ears: null,
  arms: { position: [0.8, 0.12, 0.24], scale: 0.75, pads: null },
  feet: { position: [0.32, 0.06, 0.42], scale: 0.8, mode: FurMode.accent },
  extras: rig => together(antennae(rig), wings(rig)),
};

const octopus: Character = {
  name: 'Poulpe',
  skin: 'fur',
  colors: { coat: '#2bbfd4', front: '#9fe7ef', accent: '#ff8fb1' },
  frontMask: [0.55, 0.9],
  stripes: NO_STRIPES,
  body: EGG,
  face: {
    ...EGG_FACE,
    eyes: { x: 0.24, y: 0.56, size: 1.2 },
    brows: { y: 0.7, color: '#167884' },
    nose: null,
    mouth: { y: 0.41, scale: 1.1 },
    cheeks: { x: 0.37, y: 0.46 },
  },
  ears: null,
  arms: { position: [0.78, -0.2, 0.3], scale: 0.9, pads: null },
  feet: null,
  extras: tentacles,
};

/** Every coach but the robot, in the order of their numbers. */
export const CAST: readonly Character[] = [
  pawn,
  fennec,
  dino,
  axolotl,
  frog,
  bee,
  octopus,
  mushroom,
  snail,
  ghost,
  cactus,
  toast,
  rook,
];

/** The coach of number `coach`, the robot's aside: the ones after it come one place earlier. */
export function coachCharacter(coach: number): Character {
  const index = coach > ROBOT_COACH ? coach - 2 : coach - 1;
  const character = CAST[index] ?? CAST[0];
  if (!character) throw new Error('the cast is empty');
  return character;
}
