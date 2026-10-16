import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { Character, PartMotion } from './character.ts';
import { swaying, together } from './parts.ts';
import { latheGeometry, type Profile } from './shapes.ts';

// A cactus in its pot: tall and fuzzy, its two arms bent up, a flower on its
// head. It has no paws: its arms sway, and it wobbles to say hello.

const BODY: Profile = [
  [0.001, -0.62],
  [0.4, -0.62],
  [0.47, -0.4],
  [0.48, 0.6],
  [0.44, 0.98],
  [0.3, 1.2],
  [0.001, 1.26],
];

const POT: Profile = [
  [0.001, -1],
  [0.42, -1],
  [0.48, -0.96],
  [0.58, -0.5],
  [0.66, -0.47],
  [0.67, -0.35],
  [0.6, -0.32],
  [0.001, -0.36],
];

const bodyGeometry = (columns = 96) => latheGeometry(BODY, columns);

const ARM_RADIUS = 0.13;

/** An arm out from the side, bent up at the elbow, its end rounded. */
function armGeometry(side: number, height: number, reach: number): BufferGeometry {
  const curve = new CatmullRomCurve3([
    new Vector3(side * 0.3, 0, 0),
    new Vector3(side * (reach - 0.1), 0.02, 0),
    new Vector3(side * reach, 0.14, 0),
    new Vector3(side * reach, height, 0),
  ]);
  const tip = new SphereGeometry(ARM_RADIUS, 24, 12);
  tip.translate(side * reach, height, 0);
  const arm = mergeGeometries([
    new TubeGeometry(curve, 48, ARM_RADIUS, 20).toNonIndexed(),
    tip.toNonIndexed(),
  ]);
  if (!arm) throw new Error('the cactus arm would not merge');
  arm.computeVertexNormals();
  return arm;
}

function arms(rig: RigBuilder): PartMotion {
  const parts = [
    { side: -1, y: -0.05, height: 0.42, reach: 0.78 },
    { side: 1, y: 0.25, height: 0.36, reach: 0.74 },
  ].map(({ side, y, height, reach }, i) => {
    const pivot = new Group();
    pivot.position.set(side * 0.1, y, 0);
    const options = { layers: 14, length: 0.035, mode: FurMode.coat, density: 110 };
    pivot.add(
      rig.fur(armGeometry(side, height, reach), options, new Vector3(side * reach, height, 0)),
    );
    rig.body.add(pivot);
    return swaying(pivot, { axis: 'z', amount: 0.06, speed: 2, offset: i * 1.7 });
  });
  return together(...parts);
}

const petalMaterial = new MeshStandardMaterial({ color: '#ff8fc8', roughness: 0.6 });
const heartMaterial = new MeshStandardMaterial({ color: '#ffd45c', roughness: 0.5 });

function flower(rig: RigBuilder): PartMotion {
  const pivot = new Group();
  pivot.position.set(0.06, 1.22, 0.02);
  pivot.rotation.z = -0.15;
  const petal = new SphereGeometry(0.075, 20, 12);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const mesh = new Mesh(petal, petalMaterial);
    mesh.position.set(Math.sin(angle) * 0.08, 0.05, Math.cos(angle) * 0.08);
    mesh.scale.set(1, 0.45, 1);
    pivot.add(mesh);
  }
  const heart = new Mesh(new SphereGeometry(0.05, 20, 12), heartMaterial);
  heart.position.y = 0.07;
  pivot.add(heart);
  rig.body.add(pivot);
  return swaying(pivot, { axis: 'z', amount: 0.12, speed: 2.6, offset: 0.5 });
}

function pot(rig: RigBuilder): void {
  // Terracotta: matte, its fur too short and fine to show.
  const options = { layers: 12, length: 0.012, mode: FurMode.accent, density: 160 };
  rig.body.add(rig.fur(latheGeometry(POT), options));
}

export const cactus: Character = {
  name: 'Cactus',
  skin: 'clay',
  colors: { coat: '#59c27a', front: '#9be0a8', accent: '#e07a4f' },
  frontMask: [0.7, 0.8],
  stripes: [0, 0, 0],
  body: { geometry: () => bodyGeometry(), surface: () => bodyGeometry(48), bottom: -1, fur: 0.035 },
  face: {
    center: [0, 0.62],
    size: [0.36, 0.3],
    slide: { x: [-0.45, 0.45], y: [0.1, 1.1] },
    eyes: { x: 0.16, y: 0.7, size: 1 },
    brows: { y: 0.83, color: '#2f6b3f' },
    nose: null,
    mouth: { y: 0.56, scale: 0.95 },
    cheeks: { x: 0.29, y: 0.6 },
  },
  ears: null,
  arms: null,
  feet: null,
  bust: 0.15,
  extras: rig => {
    pot(rig);
    return together(arms(rig), flower(rig));
  },
};
