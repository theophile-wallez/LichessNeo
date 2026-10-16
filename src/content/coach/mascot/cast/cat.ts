import {
  CapsuleGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Character, PartMotion } from './character.ts';
import { tail } from './parts.ts';
import { BODY_BOTTOM, bodyGeometry, noseGeometry, reshape, tailGeometry } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// A round kitten: soft grey with a white muzzle and belly, triangle ears
// pink inside, a pink nose, whiskers, and a tail with a white tip, swaying.

const UP = new Vector3(0, 1, 0);
const SIDES = [-1, 1] as const;

/** A short rounded triangle, flat front to back, standing on the origin. */
function earGeometry() {
  return reshape(new SphereGeometry(0.2, 32, 24), vertex => {
    const along = Math.min(Math.max((vertex.y / 0.2 + 1) / 2, 0), 1);
    const width = 1.3 - 1.1 * along ** 1.2;
    vertex.x *= width;
    vertex.z *= width * 0.45;
    vertex.y = along * 0.4;
  });
}

const noseMaterial = new MeshPhysicalMaterial({
  color: '#ff8fa8',
  roughness: 0.3,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});
const whiskerMaterial = new MeshStandardMaterial({ color: '#6b6878', roughness: 0.6 });

/** Its pink nose and three soft whiskers either side of its muzzle, fanning out: all on
 * the face, so they slide with it. Out from the nose, the face's skin falls back. */
function muzzle(): Group {
  const group = new Group();
  const nose = new Mesh(noseGeometry(), noseMaterial);
  nose.scale.setScalar(0.62);
  group.add(nose);
  const geometry = new CapsuleGeometry(0.007, 0.3, 4, 8);
  for (const side of SIDES)
    for (const angle of [0.2, 0, -0.2]) {
      const direction = new Vector3(side * Math.cos(angle), Math.sin(angle), 0.1).normalize();
      const whisker = new Mesh(geometry, whiskerMaterial);
      whisker.quaternion.setFromUnitVectors(UP, direction);
      whisker.position.set(side * 0.4, -0.08 + angle * 0.12, -0.1).addScaledVector(direction, 0.13);
      group.add(whisker);
    }
  return group;
}

function extras(rig: RigBuilder): PartMotion {
  return tail(rig, {
    geometry: tailGeometry({ length: 1.15, radius: 0.16, taper: 0 }),
    position: [0.45, -0.68, -0.45],
    rotation: [-0.5, 0, -1.1],
    tipFrom: 0.98,
    mode: FurMode.tail,
  });
}

export const cat: Character = {
  name: 'Chat',
  skin: 'clay',
  colors: { coat: '#a3a5b8', front: '#fdfbf8', accent: '#ffa3b6' },
  frontMask: [0.62, 0.9],
  stripes: [0, 0, 0],
  body: {
    geometry: () => bodyGeometry(),
    surface: () => bodyGeometry(48, 36),
    bottom: BODY_BOTTOM,
    fur: 0.075,
  },
  face: {
    center: [0, 0.5],
    size: [0.46, 0.32],
    slide: { x: [-0.6, 0.6], y: [0.1, 1] },
    eyes: { x: 0.23, y: 0.58, size: 1.25 },
    brows: { y: 0.73, color: '#55536a' },
    nose: { build: muzzle, y: 0.49, lift: 0.015 },
    mouth: { y: 0.41, scale: 0.95 },
    cheeks: { x: 0.37, y: 0.47 },
  },
  ears: {
    geometry: earGeometry,
    position: [0.4, 0.82, -0.04],
    tilt: 0.38,
    lift: 0,
    fur: 0.04,
    inner: true,
  },
  arms: { position: [0.8, 0.12, 0.24], scale: 0.8, pads: '#ff9fb4' },
  feet: { position: [0.32, 0.06, 0.42], scale: 0.85, mode: FurMode.coat },
  extras,
};
