import {
  CapsuleGeometry,
  LatheGeometry,
  MathUtils,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The mascots' shapes: spheres and lathes bent into bodies, ears, limbs and tails.

const { smoothstep, clamp } = MathUtils;

// Welds the UV seam so normals, and the fur pushed along them, don't split.
function weld(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

/** Moves each vertex, then welds. */
export function reshape(geometry: BufferGeometry, move: (vertex: Vector3) => void): BufferGeometry {
  const position = geometry.getAttribute('position');
  const vertex = new Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    move(vertex);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  return weld(geometry);
}

/** A pear: the head is the top of the body, the belly bulges forward. */
export function bodyGeometry(columns = 96, rows = 72): BufferGeometry {
  return reshape(new SphereGeometry(1, columns, rows), vertex => {
    const taper = 1 - 0.2 * smoothstep(vertex.y, -0.3, 1);
    const paunch = 1 + 0.08 * Math.exp(-((vertex.y + 0.3) ** 2) / 0.15) * Math.max(0, vertex.z);
    vertex.x *= 0.92 * taper;
    vertex.z *= 0.84 * taper * paunch;
    vertex.y *= vertex.y > 0 ? 1.16 : 0.98;
  });
}

export const BODY_BOTTOM = -0.98;

const PAWN_PROFILE: readonly (readonly [number, number])[] = [
  [0.001, -1],
  [0.6, -1],
  [0.8, -0.93],
  [0.84, -0.8],
  [0.72, -0.66],
  [0.56, -0.48],
  [0.47, -0.2],
  [0.4, 0.02],
];

/** A chess pawn: a flared base, a waist, and a round head on top. */
export function pawnGeometry(columns = 96): BufferGeometry {
  const headY = 0.52;
  const radius = 0.53;
  const lower = new SplineCurve(PAWN_PROFILE.map(([x, y]) => new Vector2(x, y))).getPoints(48);
  // The head meets the waist where its circle is as wide as the neck.
  const start = Math.asin(0.36 / radius);
  const head = Array.from({ length: 40 }, (_, i) => {
    const angle = start + ((Math.PI - start) * (i + 1)) / 40;
    return new Vector2(Math.max(radius * Math.sin(angle), 0.001), headY - radius * Math.cos(angle));
  });
  return weld(new LatheGeometry([...lower, ...head], columns));
}

/** The ring under a pawn's head. */
export function collarGeometry(): BufferGeometry {
  const geometry = new TorusGeometry(0.4, 0.075, 16, 72);
  geometry.rotateX(Math.PI / 2);
  return reshape(geometry, vertex => {
    vertex.y *= 0.75;
  });
}

/** A tall pointed ear, flat front to back, standing on the origin. */
export function pointedEarGeometry(): BufferGeometry {
  return reshape(new SphereGeometry(0.2, 32, 24), vertex => {
    const along = clamp((vertex.y / 0.2 + 1) / 2, 0, 1);
    const width = 1.15 - 0.95 * along ** 1.3;
    vertex.x *= width;
    vertex.z *= width * 0.45;
    vertex.y = along * 0.62;
  });
}

export interface TailShape {
  readonly length: number;
  readonly radius: number;
  /** How much the tip thins. */
  readonly taper: number;
}

/** A bushy tail along +y from the origin. */
export function tailGeometry({ length, radius, taper }: TailShape): BufferGeometry {
  return reshape(new SphereGeometry(1, 40, 28), vertex => {
    const along = (vertex.y + 1) / 2;
    const bulge = 0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, along * 1.25));
    const width = Math.max(radius * (bulge - taper * 0.4 * along), 0.02);
    vertex.x *= width;
    vertex.z *= width;
    vertex.y = along * length;
  });
}

/** A rounded plate for a dinosaur's back, thin front to back so it shows head-on. */
export function plateGeometry(): BufferGeometry {
  return reshape(new SphereGeometry(0.1, 24, 16), vertex => {
    const along = (vertex.y / 0.1 + 1) / 2;
    const width = 1.15 - 0.85 * along;
    vertex.x *= width;
    vertex.z *= 0.5 * width;
    // Standing on the origin, only its foot sunk in the body.
    vertex.y = vertex.y * 1.5 + 0.11;
  });
}

/** From the shoulder (the origin) to the paw's tip. */
export const ARM_LENGTH = 0.56;

/** A mitten hanging from the shoulder, a little wider at the paw. */
export function armGeometry(): BufferGeometry {
  const radius = 0.165;
  const straight = ARM_LENGTH - radius;
  const geometry = new CapsuleGeometry(radius, straight, 8, 28);
  geometry.translate(0, -straight / 2, 0);
  return reshape(geometry, vertex => {
    const along = clamp(-vertex.y / ARM_LENGTH, 0, 1);
    vertex.x *= 1 + 0.18 * along;
    vertex.z *= 1 + 0.12 * along;
  });
}

export function footGeometry(): BufferGeometry {
  return reshape(new SphereGeometry(0.2, 28, 16), vertex => {
    vertex.x *= 1.1;
    vertex.y *= 0.55;
    vertex.z *= 1.3;
  });
}

/** A rounded triangle, wider at the top. */
export function noseGeometry(): BufferGeometry {
  const geometry = new SphereGeometry(0.07, 32, 20);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const up = position.getY(i) / 0.07;
    position.setX(i, position.getX(i) * 1.3 * (1 + 0.22 * up));
    position.setY(i, position.getY(i) * 0.82);
    position.setZ(i, position.getZ(i) * 0.75);
  }
  geometry.computeVertexNormals();
  return geometry;
}
