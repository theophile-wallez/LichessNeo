// The stars over the coach on the Support page: an arc around its head, the
// middle one the largest and highest, smaller and tilted away toward the ends.

export interface ArcStar {
  /** From the arc's center, in px: x to the right, y down. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** In degrees, away from the middle. */
  readonly tilt: number;
  /** Steps from the middle, for the stars to come in from it outward. */
  readonly order: number;
}

export interface Arc {
  readonly count: number;
  readonly radius: number;
  /** The angle the stars span, in degrees, centered on the top. */
  readonly spread: number;
  readonly largest: number;
  readonly smallest: number;
}

const TILT_PER_STEP = 9;

export function arcStars({ count, radius, spread, largest, smallest }: Arc): ArcStar[] {
  const middle = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    const step = i - middle;
    const angle = (middle === 0 ? 0 : (step / middle) * (spread / 2)) * (Math.PI / 180);
    const away = middle === 0 ? 0 : Math.abs(step) / middle;
    return {
      x: Math.round(Math.sin(angle) * radius),
      y: Math.round(-Math.cos(angle) * radius),
      size: Math.round(largest - (largest - smallest) * away),
      tilt: step * TILT_PER_STEP,
      order: Math.abs(step),
    };
  });
}
