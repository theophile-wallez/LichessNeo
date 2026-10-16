import {
  BackSide,
  CurvePath,
  Group,
  LineCurve3,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { PartMotion } from './character.ts';
import { together } from './parts.ts';
import { meltedMin, reshape } from './shapes.ts';
import { easing } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// A cloud's shape and its weather: lobes melted into one puff, a few drops of
// rain under it when it's sad, lightning when it's angry, and a little rainbow
// over it when it's delighted.

const { clamp, smoothstep } = MathUtils;

type Lobe = readonly [x: number, y: number, z: number, radius: number];

// A round middle for the face, puffs over and around it, and one behind for depth.
const LOBES: readonly Lobe[] = [
  [0, 0, 0, 0.78],
  [0, 0.62, -0.08, 0.5],
  [-0.5, 0.42, -0.02, 0.44],
  [0.52, 0.38, -0.02, 0.42],
  [-0.84, -0.1, 0, 0.42],
  [0.86, -0.12, 0, 0.4],
  [-0.44, -0.5, 0.04, 0.4],
  [0.44, -0.52, 0.04, 0.4],
  [0, 0.15, -0.28, 0.55],
];

// How wide the creases between the puffs are melted.
const MELT = 0.12;
const DEPTH = 0.8;

function distance(point: Vector3): number {
  let nearest = Infinity;
  for (const [x, y, z, radius] of LOBES)
    nearest = meltedMin(nearest, Math.hypot(point.x - x, point.y - y, point.z - z) - radius, MELT);
  return nearest;
}

/** How far out from the middle the cloud's skin is along `direction`, by bisection. */
function reach(direction: Vector3): number {
  const probe = new Vector3();
  let [inside, outside] = [0, 2];
  for (let i = 0; i < 28; i++) {
    const middle = (inside + outside) / 2;
    if (distance(probe.copy(direction).multiplyScalar(middle)) < 0) inside = middle;
    else outside = middle;
  }
  return inside;
}

/** The puffs as one skin, squeezed front to back and a little flatter underneath. */
export function cloudGeometry(rows = 72): BufferGeometry {
  return reshape(new SphereGeometry(1, Math.round(rows * 1.4), rows), vertex => {
    vertex.multiplyScalar(reach(vertex.clone().normalize()));
    vertex.z *= DEPTH;
    if (vertex.y < 0) vertex.y *= 0.86;
  });
}

const rainMaterial = new MeshPhysicalMaterial({
  color: '#8fd0ff',
  roughness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
});

/** A drop, round at the bottom and drawn to a soft point at the top. */
function dropGeometry(): BufferGeometry {
  return reshape(new SphereGeometry(0.055, 20, 14), vertex => {
    const up = Math.max(vertex.y / 0.055, 0);
    vertex.x *= 1 - 0.75 * up ** 1.4;
    vertex.z *= 1 - 0.75 * up ** 1.4;
    vertex.y *= vertex.y > 0 ? 1.9 : 1;
  });
}

const rainy = (mood: CoachMood): boolean => mood === 'sad' || mood === 'worry';

// By x, z and phase: they fall from inside the cloud to the ground below it.
const DROPS: readonly (readonly [number, number, number])[] = [
  [-0.42, 0.18, 0],
  [0.08, 0.3, 0.55],
  [0.5, 0.12, 0.25],
  [-0.12, 0.05, 0.8],
  [0.3, 0.22, 0.4],
];
const FALL = { from: -0.7, to: -1.15, seconds: 0.9 } as const;

function rain(rig: RigBuilder): PartMotion {
  const geometry = dropGeometry();
  const drops = DROPS.map(([x, z, phase]) => {
    const mesh = new Mesh(geometry, rainMaterial);
    mesh.position.set(x, FALL.from, z);
    mesh.visible = false;
    rig.body.add(mesh);
    return { mesh, phase };
  });
  const amount = easing(5);
  return {
    update: (time, mood) => {
      const shown = amount(time, rainy(mood) ? 1 : 0);
      for (const { mesh, phase } of drops) {
        const along = (time / FALL.seconds + phase) % 1;
        mesh.position.y = FALL.from + (FALL.to - FALL.from) * along ** 1.6;
        // Out of the cloud's underside, then gone as it reaches the ground.
        const size = shown * smoothstep(along, 0, 0.12) * (1 - smoothstep(along, 0.8, 1));
        mesh.scale.setScalar(size);
        mesh.visible = size > 0.02;
      }
    },
  };
}

const BOLT_LOOK = { color: '#fffdf0', transparent: true, toneMapped: false } as const;
// Its back faces only, so the glow rings the core rather than tinting it.
const GLOW_LOOK = {
  color: '#ffd84a',
  side: BackSide,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
} as const;
// Wider zigzags than the channel's path, still its height.
const BOLT_WIDTH = 1.35;

type Path = readonly (readonly [x: number, y: number])[];

// A bolt's channel: straight out of the belly, hidden in the fluff, then jagged
// down to the ground, with a short fork off a kink.
const CHANNEL: Path = [
  [0, 0],
  [0.02, -0.18],
  [0.09, -0.26],
  [-0.01, -0.32],
  [0.08, -0.41],
  [0, -0.47],
  [0.04, -0.54],
];
const FORK: Path = [
  [-0.01, -0.32],
  [-0.08, -0.38],
  [-0.06, -0.45],
];

/** Where `path` crosses height `y`: it only ever goes down. */
function crossing(path: Path, y: number): number {
  for (let i = 1; i < path.length; i++) {
    const [fromX, fromY] = path[i - 1] ?? [0, 0];
    const [toX, toY] = path[i] ?? [0, 0];
    if (y >= toY) return fromX + ((toX - fromX) * (fromY - y)) / (fromY - toY);
  }
  return path.at(-1)?.[0] ?? 0;
}

/** A tube along `path`, its kinks kept sharp, thinning toward its end. */
function boltGeometry(path: Path, radius: number): BufferGeometry {
  const curve = new CurvePath<Vector3>();
  const points = path.map(([x, y]) => new Vector3(x, y, 0));
  for (const [i, point] of points.slice(1).entries()) curve.add(new LineCurve3(points[i], point));
  const geometry = new TubeGeometry(curve, (path.length - 1) * 12, radius, 6);
  const [top, bottom] = [path[0]?.[1] ?? 0, path.at(-1)?.[1] ?? 0];
  return reshape(geometry, vertex => {
    const center = crossing(path, vertex.y);
    const thin = 1 - 0.55 * clamp((top - vertex.y) / (top - bottom), 0, 1);
    vertex.x = center + (vertex.x - center) * thin;
    vertex.z *= thin;
  });
}

/** A bolt with its own materials, to flicker alone: a bright core in a soft glow. */
function bolt(): { pivot: Group; core: MeshBasicMaterial; glow: MeshBasicMaterial } {
  const core = new MeshBasicMaterial(BOLT_LOOK);
  const glow = new MeshBasicMaterial(GLOW_LOOK);
  const pivot = new Group();
  for (const [path, radius] of [
    [CHANNEL, 0.018],
    [FORK, 0.011],
  ] as const) {
    pivot.add(new Mesh(boltGeometry(path, radius), core));
    pivot.add(new Mesh(boltGeometry(path, radius * 3.2), glow));
  }
  return { pivot, core, glow };
}

// By x, z, seconds between strikes and phase: each strikes from the belly to the ground.
const BOLTS: readonly (readonly [number, number, number, number])[] = [
  [-0.4, 0.12, 1.3, 0],
  [0.06, 0.24, 0.9, 0.35],
  [0.42, 0.1, 1.1, 0.7],
];
const STRIKE = { top: -0.6, seconds: 0.24 } as const;

/** How bright a bolt is `seconds` into its strike: a flash, a flicker off, a second flash. */
function strikeLight(seconds: number): number {
  if (seconds < 0.06) return 1;
  if (seconds < 0.1) return 0;
  return 1 - smoothstep(seconds, 0.12, STRIKE.seconds);
}

/** Bolts striking from its underside while it's angry, in short flickering bursts. */
function lightning(rig: RigBuilder): PartMotion {
  const bolts = BOLTS.map(([x, z, every, phase]) => {
    const { pivot, core, glow } = bolt();
    pivot.position.set(x, STRIKE.top, z);
    pivot.visible = false;
    rig.body.add(pivot);
    return { pivot, core, glow, every, phase };
  });
  const amount = easing(8);
  return {
    update: (time, mood) => {
      const shown = amount(time, mood === 'angry' ? 1 : 0);
      for (const { pivot, core, glow, every, phase } of bolts) {
        const strikes = time / every + phase;
        const light = shown * strikeLight((strikes % 1) * every);
        pivot.visible = light > 0.02;
        // Each strike lands a little differently: mirrored, turned.
        const strike = Math.floor(strikes);
        pivot.scale.set(strike % 2 === 0 ? BOLT_WIDTH : -BOLT_WIDTH, 1, BOLT_WIDTH);
        pivot.rotation.y = ((strike % 3) - 1) * 0.35;
        core.opacity = light;
        glow.opacity = light * 0.45;
      }
    },
  };
}

const RAINBOW = ['#ff8fa3', '#ffb86b', '#ffe27a', '#8fe3a3', '#8fc8ff'] as const;

/** A small rainbow springing from the top of its head, its feet in the puffs. */
function rainbow(rig: RigBuilder): PartMotion {
  const arch = new Group();
  arch.position.set(0, 0.74, -0.12);
  for (const [i, color] of RAINBOW.entries()) {
    const band = new TorusGeometry(0.72 - i * 0.06, 0.034, 10, 48, Math.PI);
    arch.add(new Mesh(band, new MeshStandardMaterial({ color, roughness: 0.55 })));
  }
  arch.visible = false;
  rig.body.add(arch);
  const amount = easing(6);
  return {
    update: (time, mood) => {
      const shown = amount(time, mood === 'delight' ? 1 : 0);
      arch.scale.setScalar(clamp(shown, 0.001, 1));
      arch.visible = shown > 0.02;
    },
  };
}

export const weather = (rig: RigBuilder): PartMotion =>
  together(rain(rig), lightning(rig), rainbow(rig));
