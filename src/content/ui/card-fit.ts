import type { Box, Size } from '#shared/geometry.ts';
import { clamp } from '#shared/math.ts';
import { EDGE_MARGIN } from './edge-margin.ts';

// Lichess picks the hover card's side (below, above, beside the name) from its
// size when placed, and keeps the last side tried when none fits. Ours is
// taller, and grows once placed (a player in a game gets a mini board drawn
// afterwards), so it can hang past the window's edge.

const NAME_GAP = 10;

export interface CardPlacement {
  readonly top: number;
  readonly left: number;
}

/**
 * Where the card should go to fit the window: below the name, else above,
 * else against the edge. Null when it already fits.
 */
export function fitCard(card: Box, anchor: Box | null, viewport: Size): CardPlacement | null {
  const maxTop = viewport.height - EDGE_MARGIN - card.height;
  const maxLeft = viewport.width - EDGE_MARGIN - card.width;
  const fitsHeight = card.top >= EDGE_MARGIN && card.top <= maxTop;
  if (fitsHeight && card.left >= EDGE_MARGIN && card.left <= maxLeft) return null;
  let top = clamp(card.top, EDGE_MARGIN, maxTop);
  // Above or below the name (not beside it): stay clear of it if possible.
  if (anchor && card.left < anchor.right && card.right > anchor.left) {
    if (anchor.bottom + NAME_GAP <= maxTop) top = anchor.bottom + NAME_GAP;
    else if (anchor.top - NAME_GAP - card.height >= EDGE_MARGIN)
      top = anchor.top - NAME_GAP - card.height;
  }
  return { top, left: clamp(card.left, EDGE_MARGIN, maxLeft) };
}

/**
 * Beside a column of names rather than over it (a team's members): before the column if the
 * card fits there, else after it, level with the name as far as the window allows. Null when
 * it fits on neither side.
 */
export function besideColumn(
  card: Box,
  anchor: Box,
  column: Box,
  viewport: Size,
): CardPlacement | null {
  const before = column.left - NAME_GAP - card.width;
  const after = column.right + NAME_GAP;
  let left: number;
  if (before >= EDGE_MARGIN) left = before;
  else if (after + card.width <= viewport.width - EDGE_MARGIN) left = after;
  else return null;
  const maxTop = Math.max(EDGE_MARGIN, viewport.height - EDGE_MARGIN - card.height);
  const top = clamp(anchor.top + anchor.height / 2 - card.height / 2, EDGE_MARGIN, maxTop);
  return { top, left };
}
