import type { Padding } from '#shared/geometry.ts';
import type { ValueScale } from './model.ts';

// Where each part of the plot goes. The bars' rows are a fixed height, the
// same one their labels take beside the SVG, so the two columns line up
// without ever measuring the page.

export const ROW_HEIGHT = 38;
export const BAR_HEIGHT = 20;
/** Between two segments of a stacked bar, so each keeps its rounded ends. */
export const SEGMENT_GAP = 2;

// Room under the rows for the value axis, and at a bar's end for its value.
const AXIS_ROOM = 26;
const VALUE_ROOM = 58;

export interface BarsGeometry {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly rowsBottom: number;
  /** Where the value 0 stands, a bar's foot. */
  readonly zero: number;
  readonly x: (value: number) => number;
  readonly rowTop: (index: number) => number;
}

export function barsLayout(width: number, count: number, scale: ValueScale): BarsGeometry {
  // Every row's number sits past the track, in a column of its own.
  const left = 0;
  const right = width - VALUE_ROOM;
  const span = scale.max - scale.min;
  const x = (value: number) => left + ((value - scale.min) / span) * (right - left);
  const rowsBottom = count * ROW_HEIGHT;
  return {
    width,
    height: rowsBottom + AXIS_ROOM,
    left,
    right,
    rowsBottom,
    zero: x(0),
    x,
    rowTop: index => index * ROW_HEIGHT,
  };
}

export const CURVE_PADDING: Padding = { top: 16, right: 14, bottom: 28, left: 48 };

export interface CurveGeometry {
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly bottom: number;
  readonly plotWidth: number;
  readonly x: (index: number) => number;
  readonly y: (value: number) => number;
}

export function curveLayout(
  width: number,
  height: number,
  count: number,
  scale: ValueScale,
): CurveGeometry {
  const { top, right, bottom: bottomRoom, left } = CURVE_PADDING;
  const plotWidth = width - left - right;
  const bottom = height - bottomRoom;
  const span = scale.max - scale.min;
  return {
    width,
    height,
    top,
    bottom,
    plotWidth,
    // One point sits in the middle rather than on the left edge.
    x: index => (count < 2 ? left + plotWidth / 2 : left + (index / (count - 1)) * plotWidth),
    y: value => bottom - ((value - scale.min) / span) * (bottom - top),
  };
}
