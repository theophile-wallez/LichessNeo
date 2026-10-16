import {
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { Character, PartMotion } from './character.ts';
import { solid } from './finishes.ts';
import { latheGeometry, reshape, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import { Spring } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// A soft-boiled egg in its egg cup, the top of its shell broken off as a little
// cap that pops up when it's surprised or delighted, showing the yolk.

const { clamp, smoothstep } = MathUtils;

const EGG = { middle: 0.22, half: 0.88, radius: 0.66, lean: 0.12 } as const;
/** Where the shell is broken, and its zigzag's teeth: how many, and how tall. */
const CUT = 0.66;
const TEETH = 7;
const TOOTH = 0.045;
const RIM = 0.035;

/** The egg's radius at height `y`, wider toward its bottom. */
function eggRadius(y: number): number {
  const along = (y - EGG.middle) / EGG.half;
  return EGG.radius * Math.sqrt(Math.max(0, 1 - along * along)) * (1 - EGG.lean * along);
}

/** The egg's outline from height `from` to `to`, its points closer where it curves most. */
function outline(from: number, to: number): [number, number][] {
  // Clamped: rounding can put the egg's ends a hair past ±1.
  const start = Math.acos(clamp((EGG.middle - from) / EGG.half, -1, 1));
  const end = Math.acos(clamp((EGG.middle - to) / EGG.half, -1, 1));
  return Array.from({ length: 24 }, (_, i) => {
    const y = EGG.middle - EGG.half * Math.cos(start + ((end - start) * i) / 23);
    return [Math.max(eggRadius(y), 0.001), y];
  });
}

/** How far the break rises over `CUT` round the egg: rounded zigzag teeth. */
const breakAt = (x: number, z: number): number =>
  TOOTH * (1 + (2 / Math.PI) * Math.asin(0.92 * Math.sin(Math.atan2(x, z) * TEETH)));

/** Raises the shell's edge to the break, keeping it on the egg's outline. */
function broken(profile: Profile, weight: (y: number) => number, columns = 96): BufferGeometry {
  return reshape(latheGeometry(profile, columns), vertex => {
    const rise = weight(vertex.y) * breakAt(vertex.x, vertex.z);
    const widen = eggRadius(vertex.y + rise) / Math.max(eggRadius(vertex.y), 0.001);
    vertex.x *= widen;
    vertex.z *= widen;
    vertex.y += rise;
  });
}

// The shell up to the break, then in over its edge and down to a hollow the white fills.
const SHELL: Profile = [
  ...outline(-0.66, CUT),
  [eggRadius(CUT) - RIM, CUT],
  [eggRadius(CUT) - RIM - 0.01, CUT - 0.05],
  [0.001, CUT - 0.06],
];

// Hollow, as a shell is: the yolk fits under it.
const CAP: Profile = [
  [0.001, CUT + 0.22],
  [0.3, CUT + 0.17],
  [0.44, CUT + 0.06],
  [eggRadius(CUT) - RIM, CUT - 0.01],
  ...outline(CUT, EGG.middle + EGG.half),
];

const shellGeometry = (columns = 96): BufferGeometry =>
  broken(SHELL, y => smoothstep(y, CUT - 0.07, CUT - 0.005), columns);

const capGeometry = (): BufferGeometry =>
  broken(CAP, y => 1 - smoothstep(y, CUT + 0.005, CUT + 0.08));

// The foot, a short stem, and a bowl the egg sits deep in.
const CUP: Profile = [
  [0.001, -1],
  [0.44, -1],
  [0.48, -0.96],
  [0.44, -0.9],
  [0.26, -0.84],
  [0.22, -0.76],
  [0.34, -0.66],
  [0.56, -0.54],
  [0.7, -0.36],
  [0.74, -0.2],
  [0.71, -0.15],
  [0.66, -0.2],
  [0.001, -0.5],
];

const CUP_COLOR = '#8ec5ff';
const cupMaterial = solid('ceramic', CUP_COLOR);
const yolkMaterial = new MeshPhysicalMaterial({
  color: '#ffbe2e',
  roughness: 0.25,
  clearcoat: 0.6,
});
const whiteMaterial = new MeshPhysicalMaterial({ color: '#fffdf8', roughness: 0.5 });

/** The white and the yolk, filling the shell to its edge. */
function inside(rig: RigBuilder): void {
  const radius = eggRadius(CUT) - RIM - 0.005;
  const white = new Mesh(new CylinderGeometry(radius, radius, 0.04, 48), whiteMaterial);
  white.position.y = CUT - 0.02;
  // Domed well above the edge: the camera, about level with it, would miss a flat one.
  const yolk = new Mesh(new SphereGeometry(0.3, 40, 24), yolkMaterial);
  yolk.scale.y = 0.75;
  yolk.position.y = CUT - 0.05;
  rig.body.add(white, yolk);
}

/** How high the cap pops, and how much it tips, in each mood. */
function capPose(mood: CoachMood): readonly [number, number] {
  if (mood === 'shock') return [0.3, -0.1];
  if (mood === 'delight') return [0.24, 0.2];
  return [0, 0];
}

function cap(rig: RigBuilder): PartMotion {
  const pivot = new Group();
  pivot.position.y = CUT;
  const geometry = capGeometry();
  geometry.translate(0, -CUT, 0);
  pivot.add(rig.fur(geometry, { layers: 12, length: 0.03, mode: FurMode.coat }));
  rig.body.add(pivot);
  const lift = new Spring(150, 9);
  const tip = new Spring(120, 8);
  let last = 0;
  return {
    update: (time, mood) => {
      const dt = Math.min(time - last, 0.1);
      last = time;
      [lift.target, tip.target] = capPose(mood);
      // Delighted, it bobs over the egg.
      const bob = mood === 'delight' ? Math.sin(time * 9) * 0.03 : 0;
      pivot.position.y = CUT + Math.max(0, lift.step(dt)) + bob;
      pivot.rotation.z = tip.step(dt);
    },
  };
}

export const boiledEgg: Character = {
  name: 'Œuf à la coque',
  skin: 'clay',
  colors: { coat: '#fff3e3', front: '#fff6ea', accent: CUP_COLOR },
  frontMask: [0.4, 0.6],
  stripes: [0, 0, 0],
  body: {
    geometry: () => shellGeometry(),
    surface: () => shellGeometry(48),
    bottom: -1,
    fur: 0.04,
  },
  face: {
    center: [0, 0.24],
    size: [0.46, 0.32],
    slide: { x: [-0.55, 0.55], y: [-0.15, 0.6] },
    eyes: { x: 0.21, y: 0.32, size: 1.15 },
    brows: { y: 0.47, color: '#8a5a3c' },
    nose: null,
    mouth: { y: 0.17, scale: 1 },
    cheeks: { x: 0.36, y: 0.2 },
  },
  ears: null,
  arms: { position: [0.6, 0.08, 0.1], scale: 0.52, pads: null },
  feet: null,
  extras: rig => {
    rig.body.add(new Mesh(latheGeometry(CUP), cupMaterial));
    inside(rig);
    return cap(rig);
  },
};
