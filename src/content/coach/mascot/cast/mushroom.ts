import { Group, Mesh, SphereGeometry, Vector3 } from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { Character, PartMotion } from './character.ts';
import { hitSkin, swaying } from './parts.ts';
import { latheGeometry, reshape, type Profile } from './shapes.ts';

// A little mushroom: a short chubby stalk with big eyes just under a round
// spotted cap, worn askew, that wobbles as it moves.

const UP = new Vector3(0, 1, 0);

// Short and chubby, a little wider at the bottom.
const STALK: Profile = [
  [0.001, -1],
  [0.46, -1],
  [0.62, -0.9],
  [0.68, -0.55],
  [0.64, -0.12],
  [0.54, 0.27],
  [0.001, 0.35],
];

// A round bun of a cap, its rim tucked under.
const CAP: Profile = [
  [0.001, 0.02],
  [0.6, 0.02],
  [0.92, 0.06],
  [1.04, 0.16],
  [1.06, 0.32],
  [0.96, 0.56],
  [0.74, 0.8],
  [0.4, 0.95],
  [0.001, 0.99],
];

const stalkGeometry = (columns = 96) => latheGeometry(STALK, columns);

/** By angle round the cap and up from its rim, and size: a few big ones, a few small. */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-0.35, 0.55, 1.7],
  [0.5, 0.75, 1.25],
  [0.05, 0.2, 1],
  [0.9, 0.22, 0.85],
  [-1.05, 0.25, 1.1],
  [1.9, 0.5, 1.3],
  [-2, 0.55, 1.2],
  [3, 0.4, 1.4],
];

function spots(rig: RigBuilder, pivot: Group, cap: Mesh): void {
  const spot = reshape(new SphereGeometry(0.11, 24, 12), vertex => {
    vertex.y *= 0.3;
  });
  for (const [angle, rise, size] of SPOTS) {
    const outward = new Vector3(Math.sin(angle), rise * 1.6 + 0.2, Math.cos(angle));
    const hit = hitSkin(cap, outward);
    if (!hit) continue;
    const mesh = rig.fur(spot, { layers: 10, length: 0.02, mode: FurMode.front });
    mesh.position.copy(hit.point);
    mesh.quaternion.setFromUnitVectors(UP, hit.normal);
    mesh.scale.setScalar(size);
    pivot.add(mesh);
  }
}

function cap(rig: RigBuilder): PartMotion {
  const pivot = new Group();
  pivot.position.y = 0.23;
  pivot.scale.setScalar(0.92);
  // Worn a little askew.
  pivot.rotation.z = 0.07;
  const geometry = latheGeometry(CAP);
  pivot.add(rig.fur(geometry, { layers: 16, length: 0.05, mode: FurMode.accent }));
  spots(rig, pivot, new Mesh(geometry));
  rig.body.add(pivot);
  return swaying(pivot, { axis: 'z', amount: 0.05, speed: 2.2, offset: 0 });
}

export const mushroom: Character = {
  name: 'Champignon',
  skin: 'velvet',
  colors: { coat: '#fff1dc', front: '#fffaf2', accent: '#ff6b7a' },
  frontMask: [0.6, 0.7],
  stripes: [0, 0, 0],
  body: {
    geometry: () => stalkGeometry(),
    surface: () => stalkGeometry(48),
    bottom: -1,
    fur: 0.05,
  },
  face: {
    center: [0, -0.17],
    size: [0.5, 0.36],
    slide: { x: [-0.55, 0.55], y: [-0.65, 0.2] },
    eyes: { x: 0.2, y: -0.09, size: 1.4, style: 'insect' },
    brows: { y: 0.08, color: '#a0705a' },
    nose: null,
    mouth: { y: -0.25, scale: 0.9 },
    cheeks: { x: 0.37, y: -0.22 },
  },
  ears: null,
  arms: { position: [0.64, -0.42, 0.12], scale: 0.42, pads: null },
  feet: { position: [0.28, 0.05, 0.3], scale: 0.6, mode: FurMode.coat },
  bust: -0.35,
  extras: cap,
};
