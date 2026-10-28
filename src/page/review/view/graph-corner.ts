import { queryOne, setData } from '#shared/dom.ts';

// The move-by-move graph's views toggle sits over its top left corner, and
// goes down to the bottom one when the curve (or the columns) runs under it
// there but less so below: a game White leads from the start.

/** What a graph draws at one x, from its top to its bottom. */
export interface Span {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

export type Corner = 'top' | 'bottom';

export interface ToggleBox {
  readonly width: number;
  readonly height: number;
  /** Its room from the graph's edges (styles/review/graph-views.css). */
  readonly inset: number;
  readonly graphHeight: number;
}

// A dot is drawn on the curve, 3.5px around it: some room besides.
const MARGIN = 5;

/** The left corner where the toggle covers least of the graph: the top one unless it covers more. */
export function toggleCorner(spans: readonly Span[], box: ToggleBox): Corner {
  const { width, height, inset, graphHeight } = box;
  const right = inset + width + MARGIN;
  const covered = (top: number): number =>
    spans.filter(
      span => span.x <= right && span.top <= top + height + MARGIN && span.bottom >= top - MARGIN,
    ).length;
  const up = covered(inset);
  if (up === 0) return 'top';
  return covered(graphHeight - inset - height) < up ? 'bottom' : 'top';
}

const INSET = 6;

/**
 * Puts the toggle beside `graph` where it covers least of what `spans` draws,
 * and says how far it takes the graph's bottom: 0 at the top, or while it's
 * hidden (a game without move times).
 */
export function placeToggle(
  graph: HTMLElement,
  spans: () => readonly Span[],
  graphHeight: number,
): number {
  const toggle =
    graph.parentElement && queryOne(graph.parentElement, '.ln-ext-graph-views', HTMLElement);
  if (!toggle) return 0;
  const box = { width: toggle.offsetWidth, height: toggle.offsetHeight, inset: INSET, graphHeight };
  const corner = toggle.hidden ? 'top' : toggleCorner(spans(), box);
  setData(toggle, 'lnExtCorner', corner === 'bottom' ? 'bottom' : null);
  return corner === 'bottom' ? INSET + box.width + INSET : 0;
}
