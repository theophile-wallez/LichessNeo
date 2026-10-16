import {
  CatmullRomCurve3,
  Group,
  LatheGeometry,
  MathUtils,
  SphereGeometry,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { Character, PartMotion } from './character.ts';
import { reshape, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { PIECE_FOOT, pieceRing, wobbly } from './chess-piece.ts';

// A chess bishop, the pawn's family: a plump drop of a head on the pawn's
// foot, its slit a soft groove slanting down the front of its head, lined in
// the accent, and a little ball on its tip that wobbles.

const { smoothstep } = MathUtils;

const HEAD: Profile = [
  [0.56, -0.48],
  [0.47, -0.22],
  [0.46, -0.04],
  [0.6, 0.24],
  [0.63, 0.5],
  [0.55, 0.8],
  [0.36, 1.04],
  [0.15, 1.19],
  [0.001, 1.22],
];

const TIP = 1.22;

const OUTLINE = new SplineCurve(
  [...PIECE_FOOT, ...HEAD].map(([x, y]) => new Vector2(x, y)),
).getPoints(200);

/** The head's radius at height `y`, on its upper half, where it narrows to the tip. */
function radiusAt(y: number): number {
  for (let i = OUTLINE.length - 1; i > 0; i--) {
    const [upper, lower] = [OUTLINE[i], OUTLINE[i - 1]];
    if (upper && lower && lower.y <= y && y <= upper.y)
      return lower.x + ((upper.x - lower.x) * (y - lower.y)) / (upper.y - lower.y || 1);
  }
  return 0;
}

// The slit lies on the plane through the head where x * SLIT.x + y * SLIT.y = SLIT_OFFSET:
// on the front, a line from near the tip down to the right side.
const SLIT = new Vector2(0.4, 0.45).normalize();
const SLIT_OFFSET = 0.78;
const SLIT_DEPTH = 0.1;
const SLIT_WIDTH = 0.06;
const SLIT_RANGE = [0.6, 1] as const;

/** How deep the slit is at a point of the skin: on the front, and clear of the face and the tip. */
function slitDepth(vertex: Vector3): number {
  const across = (vertex.x * SLIT.x + vertex.y * SLIT.y - SLIT_OFFSET) / SLIT_WIDTH;
  const reach =
    smoothstep(vertex.y, 0.5, 0.62) *
    (1 - smoothstep(vertex.y, 1.02, 1.12)) *
    smoothstep(vertex.z, 0, 0.2);
  return SLIT_DEPTH * Math.exp(-(across ** 2)) * reach;
}

function bishopGeometry(columns = 128): BufferGeometry {
  return reshape(new LatheGeometry(OUTLINE, columns), vertex => {
    const radius = Math.hypot(vertex.x, vertex.z);
    if (radius < 0.01) return;
    const scale = Math.max(radius - slitDepth(vertex), 0) / radius;
    vertex.x *= scale;
    vertex.z *= scale;
  });
}

/** Where the slit's floor is at height `y`, `sink` under the skin. */
function slitPoint(y: number, sink: number): Vector3 {
  const radius = radiusAt(y);
  const x = (SLIT_OFFSET - SLIT.y * y) / SLIT.x;
  const z = Math.sqrt(Math.max(radius ** 2 - x ** 2, 0));
  const inward = (radius - sink) / radius;
  return new Vector3(x * inward, y, z * inward);
}

/** The accent lining the slit, its ends rounded. */
function slitLining(rig: RigBuilder): void {
  const [from, to] = SLIT_RANGE;
  const points = Array.from({ length: 12 }, (_, i) =>
    slitPoint(from + ((to - from) * i) / 11, SLIT_DEPTH * 0.55),
  );
  const options = { layers: 10, length: 0.02, mode: FurMode.accent };
  rig.body.add(rig.fur(new TubeGeometry(new CatmullRomCurve3(points), 48, 0.04, 12), options));
  for (const end of [points[0], points.at(-1)]) {
    if (!end) continue;
    const cap = rig.fur(new SphereGeometry(0.04, 16, 12), options);
    cap.position.copy(end);
    rig.body.add(cap);
  }
}

function ball(rig: RigBuilder): PartMotion {
  const pivot = new Group();
  pivot.position.y = TIP - 0.05;
  const knob = rig.fur(new SphereGeometry(0.15, 32, 20), {
    layers: 12,
    length: 0.03,
    mode: FurMode.accent,
  });
  knob.position.y = 0.15;
  pivot.add(knob);
  rig.body.add(pivot);
  return wobbly(pivot, { sway: 0.1, hop: 1.5 });
}

function regalia(rig: RigBuilder): PartMotion {
  pieceRing(rig, { radius: 0.46, y: -0.12, thickness: 0.085 });
  slitLining(rig);
  return ball(rig);
}

export const bishop: Character = {
  name: 'Fou',
  skin: 'velvet',
  colors: { coat: '#8fdcb8', front: '#c9f2df', accent: '#ff8fa3' },
  frontMask: [0.6, 0.75],
  stripes: [0, 0, 0],
  body: {
    geometry: () => bishopGeometry(),
    surface: () => bishopGeometry(48),
    bottom: -1,
    fur: 0.05,
  },
  face: {
    center: [0, 0.3],
    size: [0.48, 0.34],
    slide: { x: [-0.5, 0.5], y: [-0.15, 0.7] },
    eyes: { x: 0.22, y: 0.36, size: 1.25 },
    brows: { y: 0.51, color: '#2f7a5a' },
    nose: null,
    mouth: { y: 0.2, scale: 1.2 },
    cheeks: { x: 0.38, y: 0.24 },
  },
  ears: null,
  arms: { position: [0.56, -0.12, 0.1], scale: 0.62, pads: null },
  feet: null,
  bust: 0.04,
  extras: regalia,
};
