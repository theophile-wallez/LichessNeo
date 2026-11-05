import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  opposite,
  type Square,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { materialBalance } from './swing.ts';

// The queens traded or kept: a side ahead in material offers the trade, a
// side behind steps out of it.

// Two pawns' worth ahead or behind: enough for the trade to matter.
const AHEAD = 2;

const queenOf = (board: Board, color: Color): Square | null =>
  [...board].find(([, piece]) => piece.role === 'queen' && piece.color === color)?.[0] ?? null;

// The queen on `ours` stands where the other queen takes it, and is taken back.
function offered(board: Board, ours: Square, color: Color): boolean {
  const theirs = queenOf(board, opposite(color));
  return (
    theirs !== null &&
    attackedSquares(board, theirs).includes(ours) &&
    attackers(board, ours, color).length > 0
  );
}

/** The queen moved from `from` to `to` that offers its trade, or declines it. */
export function queenTradeOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
  color: Color,
): Plan | null {
  if (after.get(to)?.role !== 'queen') return null;
  const balance = materialBalance(after, color);
  if (balance >= AHEAD && offered(after, to, color)) return { kind: 'queenTrade', declined: false };
  const theirs = queenOf(after, opposite(color));
  const away = theirs !== null && !attackedSquares(after, theirs).includes(to);
  return balance <= -AHEAD && away && offered(before, from, color)
    ? { kind: 'queenTrade', declined: true }
    : null;
}
