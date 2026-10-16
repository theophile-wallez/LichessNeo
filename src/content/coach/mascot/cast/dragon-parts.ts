import {
  CapsuleGeometry,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import type { PartMotion } from './character.ts';
import { tail, together } from './parts.ts';
import { reshape, tailGeometry } from './shapes.ts';
import { wingBeat } from './wing-beat.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import { damp } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// What makes the dragon a dragon on its egg: horns, wings, a tail, and the
// smoke it puffs from its nostrils when it's angry.

const { clamp, smoothstep } = MathUtils;
const SIDES = [-1, 1] as const;

/** A nubby horn, rounded at its tip, standing on the origin. */
function hornGeometry(): BufferGeometry {
  const geometry = new CapsuleGeometry(0.07, 0.08, 8, 20);
  geometry.translate(0, 0.05, 0);
  return reshape(geometry, vertex => {
    const width = 1 - 0.3 * clamp(vertex.y / 0.16, 0, 1);
    vertex.x *= width;
    vertex.z *= width;
  });
}

function horns(rig: RigBuilder): void {
  const geometry = hornGeometry();
  for (const side of SIDES) {
    const pivot = new Group();
    pivot.position.set(side * 0.27, 1.02, -0.02);
    pivot.rotation.set(-0.15, 0, -side * 0.4);
    pivot.scale.setScalar(1.2);
    pivot.add(rig.fur(geometry, { layers: 8, length: 0.012, mode: FurMode.front }));
    rig.body.add(pivot);
  }
}

/** A bat's wing out along `side`: an arched top edge to a rounded tip, three scallops below. */
function wingGeometry(side: number): BufferGeometry {
  const shape = new Shape();
  const point = (x: number, y: number): [number, number] => [side * x, y];
  shape.moveTo(...point(0, 0));
  shape.quadraticCurveTo(...point(0.06, 0.34), ...point(0.34, 0.42));
  // A rounded tip.
  shape.quadraticCurveTo(...point(0.45, 0.45), ...point(0.4, 0.34));
  shape.quadraticCurveTo(...point(0.3, 0.32), ...point(0.27, 0.2));
  shape.quadraticCurveTo(...point(0.16, 0.18), ...point(0.12, 0.07));
  shape.quadraticCurveTo(...point(0.04, 0.07), ...point(0, 0));
  return new ExtrudeGeometry(shape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 3,
    curveSegments: 16,
  });
}

const BURST = { seconds: 1.4, beats: 5, lift: 0.5 } as const;
const FLUTTER = { seconds: 0.6, beats: 2, lift: 0.22 } as const;

/** Little wings behind the shoulders, folded until something stirs them. */
function wings(rig: RigBuilder): PartMotion {
  const beat = wingBeat(BURST, FLUTTER);
  const pivots = SIDES.map(side => {
    const pivot = new Group();
    pivot.position.set(side * 0.42, 0.42, -0.45);
    pivot.rotation.set(0, side * 0.3, -0.25 * side);
    pivot.scale.setScalar(1.55);
    const options = { layers: 8, length: 0.012, mode: FurMode.accent };
    pivot.add(rig.fur(wingGeometry(side), options));
    rig.body.add(pivot);
    return { pivot, side };
  });
  return {
    update: (time, mood) => {
      beat.update(time, mood);
      for (const { pivot, side } of pivots) pivot.rotation.z = side * (beat.lift() - 0.25);
    },
  };
}

const TAIL_LENGTH = 0.85;

/** A short tail out to the side, a heart-shaped tuft at its tip. */
function heartTail(rig: RigBuilder): PartMotion {
  const swish = tail(rig, {
    geometry: tailGeometry({ length: TAIL_LENGTH, radius: 0.26, taper: 1.3 }),
    position: [0.5, -0.66, -0.38],
    rotation: [-0.4, 0, -1.3],
  });
  const lobe = reshape(new SphereGeometry(0.07, 24, 16), vertex => {
    vertex.z *= 0.45;
  });
  for (const side of SIDES) {
    const mesh = rig.fur(lobe, { layers: 8, length: 0.015, mode: FurMode.accent });
    mesh.position.set(side * 0.045, TAIL_LENGTH + 0.02, 0);
    mesh.rotation.z = side * 0.6;
    swish.pivot.add(mesh);
  }
  return swish;
}

const PUFFS = 3;
const NOSTRIL = { y: 0.47, z: 0.74 } as const;

/** A little cloud: three balls, overlapping. */
function cloud(material: MeshStandardMaterial): Group {
  const group = new Group();
  const ball = new SphereGeometry(1, 20, 14);
  for (const [x, y, size] of [
    [-0.55, -0.1, 0.75],
    [0, 0.2, 1],
    [0.6, -0.05, 0.7],
  ] as const) {
    const mesh = new Mesh(ball, material);
    mesh.position.set(x, y, 0);
    mesh.scale.setScalar(size);
    group.add(mesh);
  }
  return group;
}

/** Where a puff is, `along` its way from a nostril out past the cheek and up. */
function puffPlace(puff: Group, side: number, along: number): void {
  const out = along ** 0.6;
  puff.position.set(
    side * (0.06 + 0.8 * out),
    NOSTRIL.y - 0.04 * out + 0.3 * along ** 2,
    NOSTRIL.z + 0.1 * out - 0.25 * along ** 2,
  );
  puff.scale.setScalar(0.035 + 0.07 * out);
}

/** Puffs of smoke that blow from its nostrils while it's angry. */
function smoke(rig: RigBuilder): PartMotion {
  const puffs = SIDES.flatMap(side =>
    Array.from({ length: PUFFS }, (_, i) => {
      const material = new MeshStandardMaterial({
        color: '#c9c2da',
        roughness: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const puff = cloud(material);
      puff.visible = false;
      rig.body.add(puff);
      return { puff, material, side, offset: i / PUFFS };
    }),
  );
  let strength = 0;
  let lastTime = 0;
  return {
    update: (time, mood) => {
      strength = damp(strength, mood === 'angry' ? 1 : 0, 4, time - lastTime);
      lastTime = time;
      for (const { puff, material, side, offset } of puffs) {
        const along = (time * 0.7 + offset) % 1;
        puff.visible = strength > 0.02;
        // Shown once clear of the cheek, then slow to fade.
        const fade = smoothstep(along, 0.2, 0.42) * (1 - along) ** 0.7;
        material.opacity = strength * fade * 0.9;
        puffPlace(puff, side, along);
      }
    },
  };
}

export function dragonExtras(rig: RigBuilder): PartMotion {
  horns(rig);
  return together(wings(rig), heartTail(rig), smoke(rig));
}
