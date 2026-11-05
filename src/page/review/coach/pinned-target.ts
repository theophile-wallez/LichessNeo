import { attackedSquares, type Board, opposite, type Square } from '#shared/chess/index.ts';
import { exchangeGain } from '#page/review/chess/material.ts';
import { between, isInBadSpot, type Pin, pinOf } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { holds } from './pressure.ts';

// A piece already pinned, attacked once more: it can't step aside, and now it
// has more attackers than defenders.

// Whether the piece moved to `to` can be taken at a profit, the pinned piece
// left out unless it takes along its pin's line.
function exposed(after: Board, to: Square, pinned: Square, pin: Pin): boolean {
  const onLine = to === pin.pinner || between(pin.pinner, pin.behind).includes(to);
  if (onLine) return isInBadSpot(after, to);
  const without = new Map(after);
  without.delete(pinned);
  return isInBadSpot(without, to);
}

// The same pin before and after the move, by a piece other than the one moved.
function keptPin(before: Board, after: Board, square: Square, to: Square): Pin | null {
  const [was, pin] = [pinOf(before, square, true), pinOf(after, square, true)];
  if (!pin || pin.pinner === to || was?.pinner !== pin.pinner || was.behind !== pin.behind)
    return null;
  return holds(after, square, pin) ? pin : null;
}

/** A pinned piece or pawn of the other side's that the move newly attacks, and outnumbers. */
export function pinnedTargetOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
): Plan | null {
  const mover = after.get(to);
  if (!mover) return null;
  const was = attackedSquares(before, from);
  for (const square of attackedSquares(after, to)) {
    const piece = after.get(square);
    if (piece?.color !== opposite(mover.color) || was.includes(square)) continue;
    const pin = keptPin(before, after, square, to);
    if (!pin || exposed(after, to, square, pin)) continue;
    const outnumbers =
      exchangeGain(after, square, mover.color) > 0 &&
      exchangeGain(before, square, mover.color) === 0;
    if (outnumbers) return { kind: 'hitsPinned', piece, square };
  }
  return null;
}
