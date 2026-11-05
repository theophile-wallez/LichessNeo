import {
  type Board,
  opposite,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { isPassed, ownRank, pawnsOn } from './structure.ts';

// The blockade: a knight in front of a passed or an isolated pawn of the other
// side's, which stops it and can't be chased by a pawn, the best of blockaders.

// The ranks, from the pawn's side, a pawn must have come up to: past its second
// rank when passed, its fourth when isolated, as the d4 pawn of an IQP.
const PASSED_FROM = 2;
const ISOLATED_FROM = 3;

/** A knight moved to `to`, just in front of a passed or an isolated pawn of the other side's. */
export function blockadeOf(after: Board, to: Square, piece: Piece): Plan | null {
  if (piece.role !== 'knight') return null;
  const them = opposite(piece.color);
  const [file, rank] = squareCoords(to);
  const pawn = squareAt(file, rank + (them === 'white' ? -1 : 1));
  const there = pawn ? after.get(pawn) : undefined;
  if (!pawn || there?.role !== 'pawn' || there.color !== them) return null;
  const advanced = ownRank(pawn, them);
  const isolated = [file - 1, file + 1].every(side => pawnsOn(after, side, them).length === 0);
  const blocked =
    (advanced >= PASSED_FROM && isPassed(after, pawn, them)) ||
    (advanced >= ISOLATED_FROM && isolated);
  return blocked ? { kind: 'blockades', piece, pawn } : null;
}
