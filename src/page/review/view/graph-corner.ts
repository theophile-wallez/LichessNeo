import { queryOne, setData } from '#shared/dom.ts';

// The graph's views toggle sits over its top left corner, and the engine's
// button over its top right one; each goes down to the bottom corner when the
// curve (or the columns) runs under it there but less so below: the left one
// for a game White leads from the start, the right one for a game White wins.

/** What a graph draws at one x, from its top to its bottom. */
export interface Span {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

export type Corner = 'top' | 'bottom';
export type Side = 'left' | 'right';

export interface ToggleBox {
  readonly width: number;
  readonly height: number;
  /** Its room from the graph's edges (styles/review/graph-views.css). */
  readonly inset: number;
  readonly graphHeight: number;
  /** Needed on the right side only. */
  readonly graphWidth?: number;
}

// A dot is drawn on the curve, 3.5px around it: some room besides.
const MARGIN = 5;

/** The corner of `side` where the toggle covers least of the graph: the top one unless it covers more. */
export function toggleCorner(spans: readonly Span[], box: ToggleBox, side: Side = 'left'): Corner {
  const { width, height, inset, graphHeight, graphWidth = 0 } = box;
  const reach = inset + width + MARGIN;
  const under = (x: number): boolean => (side === 'left' ? x <= reach : x >= graphWidth - reach);
  const covered = (top: number): number =>
    spans.filter(
      span => under(span.x) && span.top <= top + height + MARGIN && span.bottom >= top - MARGIN,
    ).length;
  const up = covered(inset);
  if (up === 0) return 'top';
  return covered(graphHeight - inset - height) < up ? 'bottom' : 'top';
}

const INSET = 6;

interface GraphSize {
  readonly width: number;
  readonly height: number;
}

/** How far the corners' buttons take the graph's bottom, from either side. */
export interface CornersBelow {
  readonly left: number;
  readonly right: number;
}

function place(
  toggle: HTMLElement,
  side: Side,
  spans: () => readonly Span[],
  size: GraphSize,
): number {
  const box = {
    width: toggle.offsetWidth,
    height: toggle.offsetHeight,
    inset: INSET,
    graphHeight: size.height,
    graphWidth: size.width,
  };
  const corner = toggle.hidden ? 'top' : toggleCorner(spans(), box, side);
  setData(toggle, 'lnExtCorner', corner === 'bottom' ? 'bottom' : null);
  return corner === 'bottom' ? INSET + box.width + INSET : 0;
}

/**
 * Puts the views toggle and the engine's button beside `graph` where each
 * covers least of what `spans` draws, and says how far they take the graph's
 * bottom: 0 at the top, or while hidden (the toggle of a game without move times).
 */
export function placeCorners(
  graph: HTMLElement,
  spans: () => readonly Span[],
  size: GraphSize,
): CornersBelow {
  const parent = graph.parentElement;
  let drawn: readonly Span[] | null = null;
  const once = (): readonly Span[] => (drawn ??= spans());
  const views = parent && queryOne(parent, '.ln-ext-graph-views', HTMLElement);
  const engine = parent && queryOne(parent, '.ln-ext-graph-engine', HTMLElement);
  return {
    left: views ? place(views, 'left', once, size) : 0,
    right: engine ? place(engine, 'right', once, size) : 0,
  };
}
