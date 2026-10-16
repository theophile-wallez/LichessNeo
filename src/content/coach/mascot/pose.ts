// A mascot's pose: its face's, its body's and its arms' numbers, which each mood sets.

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
  /** Its cheeks' blush, from 0 to 1. */
  readonly blush: number;
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
  'blush',
] as const satisfies readonly (keyof Pose)[];

/** How it takes a mood up: a hop's strength, and kicks to its lean, its fur and its height. */
export interface Onset {
  readonly hop?: number;
  readonly lean?: number;
  readonly puff?: number;
  readonly squash?: number;
}

export interface Mood {
  readonly pose: Pose;
  readonly arms: { readonly left: Direction; readonly right: Direction };
  /** Where the eyes go, from -1 to 1 each way, or null to look around. */
  readonly look: { readonly x: number; readonly y: number } | null;
  readonly onset?: Onset;
}

export const NEUTRAL: Pose = {
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
  blush: 0,
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
