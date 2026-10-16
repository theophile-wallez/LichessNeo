import { Group, SphereGeometry, Vector3 } from 'three';
import type { Character, PartMotion } from './character.ts';
import { latheGeometry, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { pieceGeometry, pieceRing, wobbly } from './chess-piece.ts';

// A chess queen: a slender body curving up from the pawn's foot to a tall
// flared coronet, a ring of soft points each holding a pearl round a high
// dome, and a big pearl on top. The coronet wobbles, and pops up when she is startled
// or delighted.

const UP = new Vector3(0, 1, 0);

// Slimmer than the king's, swelling round her face and in again under the coronet.
const BODY: Profile = [
  [0.52, -0.52],
  [0.44, -0.38],
  [0.43, -0.2],
  [0.5, 0.05],
  [0.6, 0.3],
  [0.64, 0.46],
  [0.61, 0.58],
  [0.55, 0.68],
  [0.42, 0.78],
  [0.22, 0.84],
  [0.001, 0.86],
];

const queenGeometry = (columns = 96) => pieceGeometry(BODY, columns);

const CORONET_AT = 0.64;

// A band hugging the head, flaring out like a tulip, then in over a high dome.
const CORONET: Profile = [
  [0.001, 0],
  [0.6, 0],
  [0.63, 0.04],
  [0.66, 0.12],
  [0.7, 0.2],
  [0.75, 0.26],
  [0.71, 0.3],
  [0.6, 0.31],
  [0.52, 0.42],
  [0.4, 0.55],
  [0.22, 0.64],
  [0.001, 0.66],
];

// A soft point, rounded at its tip, that a pearl sits on.
const POINT: Profile = [
  [0.001, 0],
  [0.12, 0],
  [0.11, 0.1],
  [0.075, 0.24],
  [0.001, 0.3],
];

const POINTS = 8;

function points(rig: RigBuilder, coronet: Group): void {
  const point = latheGeometry(POINT, 32);
  const pearl = new SphereGeometry(0.1, 28, 18);
  for (let i = 0; i < POINTS; i++) {
    // Two either side of the front, clear of the pearl on top.
    const angle = ((i + 0.5) / POINTS) * Math.PI * 2;
    const holder = new Group();
    holder.position.set(Math.sin(angle) * 0.69, 0.22, Math.cos(angle) * 0.69);
    // Leaning out, as a coronet flares.
    const out = new Vector3(Math.sin(angle) * 0.25, 1, Math.cos(angle) * 0.25).normalize();
    holder.quaternion.setFromUnitVectors(UP, out);
    const stub = rig.fur(point, { layers: 10, length: 0.025, mode: FurMode.accent });
    const tip = rig.fur(pearl, { layers: 10, length: 0.025, mode: FurMode.front });
    tip.position.y = 0.33;
    holder.add(stub, tip);
    coronet.add(holder);
  }
}

function coronet(rig: RigBuilder): PartMotion {
  const pivot = new Group();
  pivot.position.y = CORONET_AT;
  const options = { layers: 10, length: 0.03, mode: FurMode.accent };
  pivot.add(rig.fur(latheGeometry(CORONET, 96), options));
  points(rig, pivot);
  const neck = rig.fur(new SphereGeometry(0.07, 24, 16), options);
  neck.position.y = 0.68;
  const pearl = rig.fur(new SphereGeometry(0.15, 32, 20), { ...options, mode: FurMode.front });
  pearl.position.y = 0.84;
  pivot.add(neck, pearl);
  rig.body.add(pivot);
  return wobbly(pivot, { sway: 0.04, hop: 1.4 });
}

function regalia(rig: RigBuilder): PartMotion {
  pieceRing(rig, { radius: 0.45, y: -0.36, thickness: 0.07 });
  return coronet(rig);
}

export const queen: Character = {
  name: 'Dame',
  skin: 'ceramic',
  colors: { coat: '#ffb8d4', front: '#fff0f6', accent: '#a982ff' },
  frontMask: [0.6, 0.75],
  stripes: [0, 0, 0],
  body: {
    geometry: () => queenGeometry(),
    surface: () => queenGeometry(48),
    bottom: -1,
    fur: 0.05,
  },
  face: {
    center: [0, 0.34],
    size: [0.46, 0.34],
    slide: { x: [-0.5, 0.5], y: [-0.1, 0.64] },
    eyes: { x: 0.22, y: 0.4, size: 1.35 },
    brows: { y: 0.54, color: '#a3487a' },
    nose: null,
    mouth: { y: 0.23, scale: 1.05 },
    cheeks: { x: 0.37, y: 0.29 },
  },
  ears: null,
  arms: { position: [0.5, -0.04, 0.1], scale: 0.6, pads: null },
  feet: null,
  bust: 0.24,
  extras: regalia,
};
