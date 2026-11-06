import { squareCoords } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';
import type { Point } from '#shared/geometry.ts';

// Board coordinates in squares, from the top left corner as shown.

// In squares: the shaft's width, the head's width and length, and how far
// from the origin square's center the arrow starts.
const SHAFT_WIDTH = 0.22;
const HEAD_WIDTH = 0.52;
const HEAD_LENGTH = 0.34;
const START_GAP = 0.35;

/** A square's column and row as shown. */
export function squareOnScreen(square: Square, whiteAtBottom: boolean): Point {
  const [file, rank] = squareCoords(square);
  return whiteAtBottom ? [file, 7 - rank] : [7 - file, rank];
}

export function squareCenter(square: Square, whiteAtBottom: boolean): Point {
  const [column, row] = squareOnScreen(square, whiteAtBottom);
  return [column + 0.5, row + 0.5];
}

export interface ArrowPath {
  readonly from: Point;
  /** Where a knight's arrow turns. */
  readonly corner?: Point;
  readonly tip: Point;
}

/** A straight arrow, or an L for a knight's move: the long leg first. */
export function arrowPath(from: Point, tip: Point): ArrowPath {
  const across = Math.abs(tip[0] - from[0]);
  const down = Math.abs(tip[1] - from[1]);
  const isKnightMove = (across === 1 && down === 2) || (across === 2 && down === 1);
  if (!isKnightMove) return { from, tip };
  const corner: Point = across > down ? [tip[0], from[1]] : [from[0], tip[1]];
  return { from, corner, tip };
}

function direction(from: Point, to: Point): Point {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
}

const normal = ([x, y]: Point): Point => [-y, x];
const offset = (point: Point, vector: Point, distance: number): Point => [
  point[0] + vector[0] * distance,
  point[1] + vector[1] * distance,
];
const formatPoint = ([x, y]: Point): string => `${x.toFixed(3)},${y.toFixed(3)}`;

// One polygon for the whole arrow, so the translucent fill has no darker overlaps.
export function arrowOutline({ from, corner, tip }: ArrowPath): string {
  const firstLeg = direction(from, corner ?? tip);
  const lastLeg = direction(corner ?? from, tip);
  const start = offset(from, firstLeg, START_GAP);
  const base = offset(tip, lastLeg, -HEAD_LENGTH);
  const firstNormal = normal(firstLeg);
  const lastNormal = normal(lastLeg);
  const half = SHAFT_WIDTH / 2;
  const left: Point[] = [offset(start, firstNormal, half)];
  const right: Point[] = [offset(start, firstNormal, -half)];
  if (corner) {
    const miter: Point = [firstNormal[0] + lastNormal[0], firstNormal[1] + lastNormal[1]];
    left.push(offset(corner, miter, half));
    right.push(offset(corner, miter, -half));
  }
  left.push(offset(base, lastNormal, half), offset(base, lastNormal, HEAD_WIDTH / 2), tip);
  right.push(offset(base, lastNormal, -half), offset(base, lastNormal, -HEAD_WIDTH / 2));
  return [...left, ...right.toReversed()].map(formatPoint).join(' ');
}
