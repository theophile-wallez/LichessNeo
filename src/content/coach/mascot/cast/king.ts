import { Group, MathUtils, Mesh, SphereGeometry, type BufferGeometry } from 'three';
import type { Character, PartMotion } from './character.ts';
import { solid } from './finishes.ts';
import { latheGeometry, reshape, softBox, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { pieceGeometry, pieceRing, wobbly } from './chess-piece.ts';

// A chess king: the tallest piece, its body flaring from the pawn's foot up
// to a broad golden crown, domed and topped with a big chubby cross. The
// crown wobbles, and pops off its head when the king is startled or delighted.

const { smoothstep } = MathUtils;

const BODY: Profile = [
  [0.58, -0.52],
  [0.55, -0.4],
  [0.6, -0.2],
  [0.68, 0.08],
  [0.72, 0.3],
  [0.72, 0.48],
  [0.68, 0.62],
  [0.58, 0.74],
  [0.36, 0.83],
  [0.001, 0.86],
];

const kingGeometry = (columns = 96) => pieceGeometry(BODY, columns);

/** Where the crown sits on the head. */
const CROWN_AT = 0.6;

// From its band round the head out to a flared rim, then in over its dome.
const CROWN: Profile = [
  [0.001, 0],
  [0.7, 0],
  [0.74, 0.03],
  [0.76, 0.1],
  [0.82, 0.2],
  [0.9, 0.28],
  [0.88, 0.34],
  [0.78, 0.32],
  [0.64, 0.3],
  [0.54, 0.38],
  [0.3, 0.45],
  [0.001, 0.46],
];

const CROWN_LOBES = 6;

/** The crown, its rim rising into soft rounded lobes, one over each stone. */
function crownGeometry(): BufferGeometry {
  return reshape(latheGeometry(CROWN, 144), vertex => {
    const rim =
      smoothstep(Math.hypot(vertex.x, vertex.z), 0.62, 0.74) * smoothstep(vertex.y, 0.12, 0.3);
    vertex.y += rim * 0.065 * (1 + Math.cos(Math.atan2(vertex.x, vertex.z) * CROWN_LOBES));
  });
}

const CROSS_AT = 0.46;

function cross(rig: RigBuilder, crown: Group): void {
  const options = { layers: 12, length: 0.03, mode: FurMode.accent };
  const orb = rig.fur(new SphereGeometry(0.11, 32, 20), options);
  orb.position.y = CROSS_AT + 0.04;
  const upright = rig.fur(softBox([0.135, 0.3, 0.13], 3, 0, 28), options);
  upright.position.y = CROSS_AT + 0.39;
  const bar = rig.fur(softBox([0.32, 0.12, 0.13], 3, 0, 28), options);
  bar.position.y = CROSS_AT + 0.42;
  crown.add(orb, upright, bar);
}

/** Pink stones round the front of the crown's band. */
function gems(crown: Group): void {
  const material = solid('ceramic', '#ff7aa8');
  for (const [angle, size] of [
    [0, 1],
    [-(Math.PI * 2) / CROWN_LOBES, 0.75],
    [(Math.PI * 2) / CROWN_LOBES, 0.75],
  ] as const) {
    const stone = new Mesh(new SphereGeometry(0.075 * size, 32, 20), material);
    stone.scale.set(1, 1.2, 0.5);
    stone.position.set(Math.sin(angle) * 0.81, 0.15, Math.cos(angle) * 0.81);
    stone.rotation.y = angle;
    crown.add(stone);
  }
}

function regalia(rig: RigBuilder): PartMotion {
  pieceRing(rig, { radius: 0.55, y: -0.42, thickness: 0.085 });
  const crown = new Group();
  crown.position.y = CROWN_AT;
  crown.add(rig.fur(crownGeometry(), { layers: 12, length: 0.03, mode: FurMode.accent }));
  cross(rig, crown);
  gems(crown);
  rig.body.add(crown);
  return wobbly(crown, { sway: 0.035, hop: 1.4 });
}

export const king: Character = {
  name: 'Roi',
  skin: 'ceramic',
  colors: { coat: '#ffe2a8', front: '#fff3d9', accent: '#f5a62e' },
  frontMask: [0.6, 0.75],
  stripes: [0, 0, 0],
  body: { geometry: () => kingGeometry(), surface: () => kingGeometry(48), bottom: -1, fur: 0.05 },
  face: {
    center: [0, 0.31],
    size: [0.5, 0.36],
    slide: { x: [-0.55, 0.55], y: [-0.1, 0.66] },
    eyes: { x: 0.25, y: 0.38, size: 1.4 },
    brows: { y: 0.52, color: '#9a6420' },
    nose: null,
    mouth: { y: 0.2, scale: 1.15 },
    cheeks: { x: 0.42, y: 0.26 },
  },
  ears: null,
  arms: { position: [0.62, -0.06, 0.1], scale: 0.66, pads: null },
  feet: null,
  bust: 0.3,
  extras: regalia,
};
