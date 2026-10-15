import type { Box, Size } from '#shared/geometry.ts';
import { clamp } from '#shared/math.ts';
import { EDGE_MARGIN } from './edge-margin.ts';

const GAP = 8;

export interface Shortcut {
  readonly label: string;
  /** The key a title ends with in brackets ("Flip board (f)"), shown as a key cap. */
  readonly key: string | null;
}

export function splitShortcut(title: string): Shortcut {
  const match = /^(.*\S)\s*\((\S)\)$/.exec(title);
  return match ? { label: match[1] ?? '', key: match[2] ?? null } : { label: title, key: null };
}

/** The eval of a variation's move, from Lichess's title: "-0.2 · Depth 22" gives "−0.2". */
export function evalOf(title: string): string {
  const [score = title] = title.split(' · ');
  return score.replace('-', '−');
}

export interface TooltipPlacement {
  readonly side: 'above' | 'below';
  readonly top: number;
  readonly left: number;
  /** The arrow's distance from the tooltip's left edge: the target's middle. */
  readonly arrow: number;
}

/** Centered above the target, or below it where there's no room above. */
export function placeTooltip(target: Box, tooltip: Size, viewportWidth: number): TooltipPlacement {
  const below = target.top - GAP - tooltip.height < EDGE_MARGIN;
  const middle = target.left + target.width / 2;
  const maxLeft = viewportWidth - EDGE_MARGIN - tooltip.width;
  const left = clamp(middle - tooltip.width / 2, EDGE_MARGIN, maxLeft);
  const top = below ? target.bottom + GAP : target.top - GAP - tooltip.height;
  return { side: below ? 'below' : 'above', top, left, arrow: middle - left };
}
