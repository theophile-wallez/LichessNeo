import type { CoachMood } from '#shared/coach.ts';

// What each of the review's moods does to the face, the body and the arms.
// An arm is the direction from shoulder to paw; the left one is the viewer's.

export type Direction = readonly [number, number, number];

export interface Pose {
  readonly smile: number;
  readonly open: number;
  readonly width: number;
  readonly skew: number;
  readonly eyeScale: number;
  readonly squint: number;
  /** Eyes shut in a happy arch. */
  readonly joy: number;
  readonly brow: number;
  readonly browLeft: number;
  readonly browRight: number;
  /** Worry lifts the brows' inner ends. */
  readonly browTilt: number;
  readonly tilt: number;
  readonly lean: number;
  readonly ears: number;
  readonly puff: number;
  readonly slump: number;
}

/** The pose's numbers, which ease from one mood to the next. */
export const POSE_KEYS = [
  'smile',
  'open',
  'width',
  'skew',
  'eyeScale',
  'squint',
  'joy',
  'brow',
  'browLeft',
  'browRight',
  'browTilt',
  'tilt',
  'lean',
  'ears',
  'puff',
  'slump',
] as const satisfies readonly (keyof Pose)[];

export interface Mood {
  readonly pose: Pose;
  readonly arms: { readonly left: Direction; readonly right: Direction };
  /** Where the eyes go, from -1 to 1 each way, or null to look around. */
  readonly look: { readonly x: number; readonly y: number } | null;
}

const NEUTRAL: Pose = {
  smile: 0.55,
  open: 0,
  width: 0.17,
  skew: 0,
  eyeScale: 1,
  squint: 0,
  joy: 0,
  brow: 0,
  browLeft: 0,
  browRight: 0,
  browTilt: 0,
  tilt: 0,
  lean: 0,
  ears: 0,
  puff: 0,
  slump: 0,
};

const REST = { left: [-0.42, -0.88, 0.3], right: [0.42, -0.88, 0.3] } as const;

export const MOODS: Readonly<Record<CoachMood, Mood>> = {
  neutral: { pose: NEUTRAL, arms: REST, look: null },
  happy: {
    pose: { ...NEUTRAL, smile: 0.95, open: 0.22, width: 0.2, squint: 0.35, ears: -0.3 },
    arms: { left: [-0.45, -0.87, 0.2], right: [0.45, -0.87, 0.2] },
    look: null,
  },
  delight: {
    pose: { ...NEUTRAL, smile: 1, open: 0.62, width: 0.23, joy: 1, ears: -0.6, puff: 0.12 },
    arms: { left: [-0.5, 0.85, 0.2], right: [0.5, 0.85, 0.2] },
    look: null,
  },
  doubt: {
    pose: {
      ...NEUTRAL,
      smile: 0.05,
      width: 0.13,
      skew: 0.55,
      squint: 0.2,
      brow: 1,
      browLeft: 0.9,
      browRight: -0.35,
      tilt: 0.1,
      ears: 0.2,
    },
    arms: { left: [-0.8, -0.5, 0.35], right: [0.8, -0.5, 0.35] },
    look: { x: 0.55, y: 0.55 },
  },
  worry: {
    pose: {
      ...NEUTRAL,
      smile: -0.55,
      open: 0.08,
      width: 0.13,
      eyeScale: 1.12,
      brow: 1,
      browLeft: 0.25,
      browRight: 0.25,
      browTilt: 0.7,
      lean: -0.03,
      ears: 1,
      slump: 1,
    },
    arms: { left: [-0.12, -0.85, 0.5], right: [0.12, -0.85, 0.5] },
    look: null,
  },
  shock: {
    pose: {
      ...NEUTRAL,
      smile: 0,
      open: 0.95,
      width: 0.12,
      eyeScale: 1.35,
      brow: 1,
      browLeft: 1,
      browRight: 1,
      lean: -0.09,
      ears: -1,
      puff: 0.4,
    },
    arms: { left: [-0.85, 0.35, 0.4], right: [0.85, 0.35, 0.4] },
    look: null,
  },
};

/** `pose` eased toward `target`, a new object. */
export function easePose(
  pose: Pose,
  target: Pose,
  ease: (from: number, to: number) => number,
): Pose {
  const eased: Record<keyof Pose, number> = { ...pose };
  for (const key of POSE_KEYS) eased[key] = ease(pose[key], target[key]);
  return eased;
}
