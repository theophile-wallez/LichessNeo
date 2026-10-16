import { MathUtils, type BufferGeometry } from 'three';
import { latheGeometry, profileRadius, reshape, type Profile } from './shapes.ts';

// The slime's shape: a drop of jelly settled on the ground, its base spread
// a little round it, two drips running down its flanks.

const { smoothstep } = MathUtils;

export const SLIME_BOTTOM = -1;

// Up from the middle of its base, out round its spread hem, then over the dome.
const PROFILE: Profile = [
  [0.001, -1],
  [0.86, -1],
  [1.08, -0.95],
  [1.1, -0.84],
  [1.0, -0.6],
  [0.9, -0.2],
  [0.76, 0.22],
  [0.55, 0.55],
  [0.28, 0.75],
  [0.001, 0.8],
];

const SIDE = PROFILE.slice(1);

/** How far its skin is from its middle at height `y`, at rest. */
export const slimeRadius = (y: number): number => profileRadius(SIDE, y);

/** Its drips, by angle round from ahead: each runs down from its top to a bead at its end. */
const DRIPS = [
  { angle: -0.95, top: 0.3, end: -0.55 },
  { angle: 1.15, top: 0.05, end: -0.7 },
] as const;

/** How far a drip swells the skin at angle `angle` and height `y`. */
function drip(angle: number, y: number): number {
  let swell = 0;
  for (const run of DRIPS) {
    const across = Math.exp(-(((angle - run.angle) / 0.14) ** 2));
    const along =
      smoothstep(y, run.end - 0.05, run.end + 0.05) * (1 - smoothstep(y, run.top - 0.2, run.top));
    const bead = Math.exp(-(((y - run.end - 0.06) / 0.07) ** 2));
    swell += across * (0.035 * along + 0.05 * bead);
  }
  return swell;
}

/** Its skin, `scale` of its size about the point `about` up its middle. */
export function slimeGeometry(columns = 96, scale = 1, about = SLIME_BOTTOM): BufferGeometry {
  return reshape(latheGeometry(PROFILE, columns), vertex => {
    const angle = Math.atan2(vertex.x, vertex.z);
    const out = 1 + drip(angle, vertex.y) / Math.max(slimeRadius(vertex.y), 0.2);
    vertex.x *= out * scale;
    vertex.z *= out * 0.92 * scale;
    vertex.y = about + (vertex.y - about) * scale;
  });
}
