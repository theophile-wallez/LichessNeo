import {
  CapsuleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { PartMotion } from './character.ts';
import { swaying, together } from './parts.ts';
import { bodyGeometry, tailGeometry } from './shapes.ts';
import { wingBeat } from './wing-beat.ts';

// What sways on a mascot beside its tail: gills, antennae, wings, tentacles,
// and the bumps a frog's eyes sit on.

const UP = new Vector3(0, 1, 0);
const SIDES = [-1, 1] as const;

/** An axolotl's three feathery gills either side of its head. */
export function gills(rig: RigBuilder): PartMotion {
  const geometry = tailGeometry({ length: 0.4, radius: 0.08, taper: 0.7 });
  const parts: PartMotion[] = [];
  for (const side of SIDES)
    for (const [i, angle] of [0.55, 1.05, 1.55].entries()) {
      const pivot = new Group();
      pivot.position.set(side * (0.5 - i * 0.03), 0.78 - i * 0.1, -0.02);
      pivot.rotation.set(-0.25, 0, -side * angle);
      const options = { layers: 12, length: 0.04, mode: FurMode.accent };
      pivot.add(rig.fur(geometry, options, new Vector3(0, 0.3, 0)));
      rig.body.add(pivot);
      parts.push(swaying(pivot, { axis: 'z', amount: 0.09, speed: 2.2, offset: i * 0.9 + side }));
    }
  return together(...parts);
}

const antennaMaterial = new MeshStandardMaterial({ color: '#2b211b', roughness: 0.4 });

/** A bee's antennae, bobbing. */
export function antennae(rig: RigBuilder): PartMotion {
  const parts = SIDES.map(side => {
    const pivot = new Group();
    pivot.position.set(side * 0.2, 1.06, 0.02);
    pivot.rotation.z = -side * 0.4;
    const stalk = new Mesh(new CapsuleGeometry(0.017, 0.36, 4, 10), antennaMaterial);
    stalk.position.y = 0.18;
    const knob = new Mesh(new SphereGeometry(0.06, 20, 14), antennaMaterial);
    knob.position.y = 0.38;
    pivot.add(stalk, knob);
    rig.body.add(pivot);
    return swaying(pivot, { axis: 'z', amount: 0.12, speed: 3, offset: side });
  });
  return together(...parts);
}

const wingMaterial = new MeshPhysicalMaterial({
  color: '#eaf6ff',
  roughness: 0.15,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  side: DoubleSide,
});

// A bee's beats are a buzz: many, quick and short.
const BUZZ = { seconds: 1.2, beats: 16, lift: 0.4 } as const;
const FLUTTER = { seconds: 0.45, beats: 5, lift: 0.25 } as const;

/** A bee's wings behind its shoulders, at rest until something stirs them. */
export function wings(rig: RigBuilder): PartMotion {
  const beat = wingBeat(BUZZ, FLUTTER);
  const pivots = SIDES.map(side => {
    const pivot = new Group();
    pivot.position.set(side * 0.45, 0.62, -0.45);
    pivot.rotation.set(0, side * 0.35, -side * 0.85);
    const wing = new Mesh(new SphereGeometry(0.3, 28, 16), wingMaterial);
    wing.scale.set(0.8, 1.35, 0.04);
    wing.position.y = 0.38;
    pivot.add(wing);
    rig.body.add(pivot);
    return { pivot, side };
  });
  return {
    update: (time, mood) => {
      beat.update(time, mood);
      for (const { pivot, side } of pivots) pivot.rotation.y = side * (0.35 + beat.lift());
    },
  };
}

const BUMP_RADIUS = 0.25;
const bumpCenters = (): Vector3[] => SIDES.map(side => new Vector3(side * 0.3, 0.93, 0.2));

/** A frog's head with the two bumps its eyes sit on: the skin its face slides over. */
export function frogSurface(): Group {
  const group = new Group();
  group.add(new Mesh(bodyGeometry(48, 36)));
  for (const center of bumpCenters()) {
    const bump = new Mesh(new SphereGeometry(BUMP_RADIUS, 32, 20));
    bump.position.copy(center);
    group.add(bump);
  }
  return group;
}

export function eyeBumps(rig: RigBuilder): PartMotion | null {
  const geometry = new SphereGeometry(BUMP_RADIUS, 32, 20);
  for (const center of bumpCenters()) {
    const bump = rig.fur(geometry, { layers: 12, length: 0.05, mode: FurMode.coat });
    bump.position.copy(center);
    rig.body.add(bump);
  }
  return null;
}

/** An octopus's legs around its bottom, wriggling one after another. */
export function tentacles(rig: RigBuilder): PartMotion {
  const geometry = tailGeometry({ length: 0.55, radius: 0.15, taper: 1.1 });
  const parts = [-2.3, -1.2, -0.42, 0.42, 1.2, 2.3].map((angle, i) => {
    const pivot = new Group();
    pivot.position.set(Math.sin(angle) * 0.55, -0.72, Math.cos(angle) * 0.5);
    pivot.quaternion.setFromUnitVectors(
      UP,
      new Vector3(Math.sin(angle), -0.55, Math.cos(angle)).normalize(),
    );
    const leg = new Group();
    const options = { layers: 12, length: 0.05, mode: FurMode.coat };
    leg.add(rig.fur(geometry, options, new Vector3(0, 0.4, 0)));
    pivot.add(leg);
    rig.body.add(pivot);
    return swaying(leg, { axis: 'x', amount: 0.22, speed: 2.4, offset: i * 1.1 });
  });
  return together(...parts);
}
