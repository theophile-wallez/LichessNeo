import { SphereGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { robotTier } from '#shared/coach.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { Character } from './character.ts';
import { robotParts } from './robot-parts.ts';
import { reshape } from './shapes.ts';

// The computer's mascot, for games against Stockfish: a glossy toy robot on
// the coaches' rig, a big round head on a neck over a small chest. Its colors
// tell Stockfish's level, one set for each two levels (styles/theme/base.css
// gives its stills the same).

type Triple = readonly [number, number, number];

/** A sphere pushed toward a box's corners, |x|^p + |y|^p + |z|^p = 1, sized and raised by `y`. */
function softBox(size: Triple, power: number, y: number, rows: number): BufferGeometry {
  return reshape(new SphereGeometry(1, Math.round(rows * 1.4), rows), vertex => {
    const reach =
      (Math.abs(vertex.x) ** power + Math.abs(vertex.y) ** power + Math.abs(vertex.z) ** power) **
      (-1 / power);
    vertex.set(
      vertex.x * reach * size[0],
      vertex.y * reach * size[1] + y,
      vertex.z * reach * size[2],
    );
  });
}

const HEAD = { size: [0.84, 0.6, 0.7], y: 0.55, power: 3.4 } as const;
const BOTTOM = -1.08;
const headGeometry = (rows = 64): BufferGeometry => softBox(HEAD.size, HEAD.power, HEAD.y, rows);

function robotBody(): BufferGeometry {
  const body = mergeGeometries([headGeometry(), softBox([0.62, 0.48, 0.52], 3, -0.6, 48)]);
  if (!body) throw new Error('the robot’s head and chest would not merge');
  return body;
}

interface RobotColors {
  /** Its neck, earphones, antennae, arms' ends and feet. */
  readonly accent: string;
  /** The light of its antennae and earphones. */
  readonly glow: string;
}

// Levels 1–2, 3–4, 5–6 and 7–8: green, blue, purple, red. The shell stays white,
// where the black eyes show.
const LEVEL_COLORS: readonly RobotColors[] = [
  { accent: '#3fcf8e', glow: '#9effc9' },
  { accent: '#4f8cff', glow: '#8be9fd' },
  { accent: '#9b6dff', glow: '#e0b8ff' },
  { accent: '#ff5a5f', glow: '#ffc38a' },
];

const robot = ({ accent, glow }: RobotColors): Character => ({
  name: 'Robot',
  skin: 'shell',
  colors: { coat: '#f4f6fb', front: '#f4f6fb', accent, light: glow },
  frontMask: [0.5, 0.86],
  stripes: [0, 0, 0],
  body: { geometry: robotBody, surface: () => headGeometry(32), bottom: BOTTOM, fur: 0 },
  face: {
    center: [0, HEAD.y],
    size: [0.5, 0.34],
    slide: { x: [-0.6, 0.6], y: [HEAD.y - 0.45, HEAD.y + 0.45] },
    eyes: { x: 0.25, y: HEAD.y + 0.06, size: 2.5 },
    brows: { y: HEAD.y + 0.28, color: '#2b3a67' },
    nose: null,
    mouth: { y: HEAD.y - 0.17, scale: 1.6 },
    cheeks: { x: 0.45, y: HEAD.y - 0.12 },
  },
  ears: null,
  arms: { position: [0.62, -0.32, 0.05], scale: 0.62, pads: null },
  feet: { position: [0.3, 0.06, 0.22], scale: 0.85, mode: FurMode.accent },
  extras: rig =>
    robotParts(rig, {
      head: { y: HEAD.y, top: HEAD.y + HEAD.size[1], side: 0.86 },
      neck: -0.12,
      panel: { geometry: softBox([0.2, 0.08, 0.05], 4, 0, 24), y: -0.55, z: 0.5 },
    }),
});

const ROBOTS: readonly Character[] = LEVEL_COLORS.map(robot);

/** The robot for Stockfish's `level`, 1 to 8. */
export function robotFor(level: number): Character {
  const character = ROBOTS[robotTier(level) - 1];
  if (!character) throw new Error('no robot for this level');
  return character;
}
