// The mouth's outline: a smile's curve, as thick as a stroke in the middle
// and thin at the corners, that opens downward.

export interface MouthShape {
  readonly width: number;
  /** From -1 (a frown) to 1. */
  readonly smile: number;
  /** From 0 (shut) to 1. */
  readonly open: number;
  /** One corner higher than the other, doubtful. */
  readonly skew: number;
}

export interface Outline {
  /** The lips' outline, top edge left to right then bottom edge back. */
  readonly points: readonly (readonly [number, number])[];
  /** The bottom edge's lowest point, where the tongue sits. */
  readonly lowest: number;
}

const STEPS = 28;

export function mouthOutline({ width, smile, open, skew }: MouthShape): Outline {
  const half = width / 2;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const x = -half + (width * i) / STEPS;
    const across = x / half;
    const bell = Math.max(0, 1 - across * across);
    const center = -smile * 0.05 * bell + skew * 0.035 * across;
    const thickness = 0.011 * Math.sqrt(bell) + 0.002;
    top.push([x, center + thickness / 2 + open * 0.012 * bell]);
    bottom.push([x, center - thickness / 2 - open * 0.1 * bell ** 0.65]);
  }
  return { points: [...top, ...bottom.toReversed()], lowest: -smile * 0.05 - 0.0065 - open * 0.1 };
}
