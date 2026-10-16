import { SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { meltedMin, reshape } from './shapes.ts';

// The knight's horse, modelled as a soft solid: rounded parts (a skull, the
// jowls, a muzzle, the neck, the chest) melted together, then skinned by
// casting out from inside it. Its head looks forward along +z, and the whole
// horse is turned three quarters, as a knight stands.

/** How far a point is outside the solid, negative inside. */
export type Distance = (point: Vector3) => number;

type Triple = readonly [number, number, number];

const scratch = new Vector3();

function ellipsoid(center: Triple, radii: Triple): Distance {
  const [x, y, z] = center;
  const [width, height, depth] = radii;
  return point => {
    scratch.set((point.x - x) / width, (point.y - y) / height, (point.z - z) / depth);
    const stretched = scratch.length();
    scratch.set(scratch.x / width, scratch.y / height, scratch.z / depth);
    return (stretched * (stretched - 1)) / Math.max(scratch.length(), 1e-6);
  };
}

/** A capsule whose radius eases from one end to the other. */
function roundCone(from: Triple, to: Triple, radii: readonly [number, number]): Distance {
  const start = new Vector3(...from);
  const axis = new Vector3(...to).sub(start);
  const length = axis.lengthSq();
  return point => {
    const along = Math.min(Math.max(scratch.copy(point).sub(start).dot(axis) / length, 0), 1);
    const radius = radii[0] + (radii[1] - radii[0]) * along;
    return scratch.copy(start).addScaledVector(axis, along).distanceTo(point) - radius;
  };
}

/** Melts the parts together, rounding their seams over about `blend`. */
function melt(blend: number, parts: readonly Distance[]): Distance {
  return point => {
    let distance = Infinity;
    for (const part of parts) distance = meltedMin(distance, part(point), blend);
    return distance;
  };
}

// The head leans forward, its muzzle down; the neck arches from behind the
// ears to the chest, which swells forward under the throat.
const HORSE_PARTS: readonly Distance[] = [
  ellipsoid([0, 0.88, -0.08], [0.46, 0.45, 0.47]),
  ellipsoid([0, 0.66, 0.12], [0.38, 0.32, 0.38]),
  roundCone([0, 0.78, 0.16], [0, 0.48, 0.5], [0.22, 0.31]),
  roundCone([0, 0.86, -0.2], [0, 0.25, -0.34], [0.32, 0.36]),
  roundCone([0, 0.25, -0.34], [0, -0.38, -0.14], [0.36, 0.42]),
  ellipsoid([0, -0.25, 0.06], [0.42, 0.38, 0.44]),
];

const horseLocal = melt(0.24, HORSE_PARTS);

const UP_AXIS = new Vector3(0, 1, 0);
const REACH = 2.2;
const STEP = 0.02;

/** How far from `from` along `direction` the solid's outermost skin is. */
function outermost(distance: Distance, from: Vector3, direction: Vector3): number {
  const point = new Vector3();
  let outside = REACH;
  while (outside > 0 && distance(point.copy(from).addScaledVector(direction, outside)) > 0)
    outside -= STEP;
  let inside = outside;
  outside += STEP;
  for (let i = 0; i < 12; i++) {
    const middle = (inside + outside) / 2;
    if (distance(point.copy(from).addScaledVector(direction, middle)) > 0) outside = middle;
    else inside = middle;
  }
  return (inside + outside) / 2;
}

/** The horse turned `turn` about the vertical from ahead, as it stands on the board. */
export class Horse {
  readonly turn: number;
  readonly distance: Distance;
  // Inside the horse, where its throat meets its neck: every part is in sight from there.
  readonly #heart: Vector3;

  constructor(turn: number) {
    this.turn = turn;
    const local = new Vector3();
    this.distance = point => horseLocal(local.copy(point).applyAxisAngle(UP_AXIS, -turn));
    this.#heart = this.placed(new Vector3(0, 0.4, 0.05));
  }

  /** The horse's point `point`, given in the head's own frame, where it stands on the board. */
  placed(point: Vector3): Vector3 {
    return point.applyAxisAngle(UP_AXIS, this.turn);
  }

  /** Its skin: a sphere pushed out from its heart to its outermost surface. */
  geometry(columns = 160): BufferGeometry {
    const direction = new Vector3();
    return reshape(new SphereGeometry(1, columns, Math.round(columns * 0.75)), vertex => {
      direction.copy(vertex).normalize();
      vertex
        .copy(this.#heart)
        .addScaledVector(direction, outermost(this.distance, this.#heart, direction));
    });
  }

  /** Where the skin is, coming from `from` along `direction`, and its outward normal there. */
  skinFrom(
    from: Vector3,
    direction: Vector3,
  ): { readonly point: Vector3; readonly normal: Vector3 } {
    const point = from.clone();
    for (let travelled = 0; travelled < 4 && this.distance(point) > 0; travelled += 0.01)
      point.addScaledVector(direction, 0.01);
    const normal = new Vector3();
    const probe = new Vector3();
    for (const axis of ['x', 'y', 'z'] as const) {
      probe.copy(point)[axis] += 0.005;
      const ahead = this.distance(probe);
      probe.copy(point)[axis] -= 0.005;
      normal[axis] = ahead - this.distance(probe);
    }
    return { point, normal: normal.normalize() };
  }
}
