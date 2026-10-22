import { niceScale, type NiceScale } from '#shared/charts/steps.ts';
import type { Padding } from '#shared/geometry.ts';
import { roundTenth } from '#shared/math.ts';

export const MIN_RATING = 400;
export const BIN_SIZE = 25;

// Room for the player counts on the left, the shares on the right, the ratings below.
export const PADDING: Padding = { top: 18, right: 48, bottom: 30, left: 50 };
// Room above the columns for each marker's pill.
export const MARKER_ROW = 30;

/** A round top for the player counts. */
export const countScale = niceScale;

interface Column {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly bottom: number;
}

/** A column standing on the axis, its top corners rounded. */
export function columnPath({ x, y, width, bottom }: Column): string {
  const radius = Math.min(3, width / 2, (bottom - y) / 2);
  const left = roundTenth(x);
  const right = roundTenth(x + width);
  const top = roundTenth(y);
  // Where the rounded corners meet the sides.
  const shoulder = roundTenth(y + radius);
  const base = roundTenth(bottom);
  const corners = `Q${left},${top} ${roundTenth(x + radius)},${top}H${roundTenth(x + width - radius)}Q${right},${top} ${right},${shoulder}`;
  return `M${left},${base}V${shoulder}${corners}V${base}Z`;
}

export interface Geometry {
  readonly width: number;
  readonly height: number;
  readonly plotWidth: number;
  /** The columns' top edge (under the markers' pills) and their axis. */
  readonly top: number;
  readonly bottom: number;
  readonly counts: NiceScale;
  readonly binWidth: number;
  readonly x: (rating: number) => number;
  readonly yCount: (players: number) => number;
  readonly yShare: (share: number) => number;
}

interface Frame {
  readonly width: number;
  readonly height: number;
  readonly counts: readonly number[];
  /** Where the last column ends (`Players.maxRating`), the x axis's right end. */
  readonly maxRating: number;
  readonly markers: number;
}

export function layOut({ width, height, counts, maxRating, markers }: Frame): Geometry {
  const top = PADDING.top + markers * MARKER_ROW;
  const plotWidth = width - PADDING.left - PADDING.right;
  const bottom = height - PADDING.bottom;
  const plotHeight = bottom - top;
  const scale = countScale(Math.max(...counts));
  return {
    width,
    height,
    plotWidth,
    top,
    bottom,
    counts: scale,
    binWidth: plotWidth / counts.length,
    x: rating => PADDING.left + ((rating - MIN_RATING) / (maxRating - MIN_RATING)) * plotWidth,
    yCount: players => bottom - (players / scale.max) * plotHeight,
    yShare: share => bottom - share * plotHeight,
  };
}
