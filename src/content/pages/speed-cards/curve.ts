import { monotoneCurve } from '#shared/charts/curve.ts';
import type { Point } from '#shared/geometry.ts';

// A speed card's rating curve, in a 100 × 30 box: its line, and the area under it.

const WIDTH = 100;
const HEIGHT = 30;
// Room above and below the line, so it never touches the box's edges.
const MARGIN = 3;

export interface CurvePaths {
  readonly line: string;
  readonly area: string;
}

/** The paths through these ratings, oldest first; null with fewer than two. */
export function curvePaths(ratings: readonly number[]): CurvePaths | null {
  if (ratings.length < 2) return null;
  const low = Math.min(...ratings);
  const span = Math.max(...ratings) - low;
  const step = WIDTH / (ratings.length - 1);
  // A flat history runs across the middle.
  const height = (rating: number): number =>
    span === 0 ? HEIGHT / 2 : HEIGHT - MARGIN - ((rating - low) / span) * (HEIGHT - 2 * MARGIN);
  const points: Point[] = ratings.map((rating, i) => [i * step, height(rating)]);
  const line = monotoneCurve(points);
  return { line, area: `${line}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z` };
}
