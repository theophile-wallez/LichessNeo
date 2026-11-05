import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  opposite,
  type Piece,
  type Role,
  type Square,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { isHanging } from '#page/review/chess/material.ts';
import type { Plan } from './idea.ts';
import { pressureOf } from './pressure.ts';

// Prophylaxis: a pawn's move that takes a square from a piece of the other
// side's, where it would have pinned or hit one of the mover's (h3 against Bg4).

const KEPT_OFF: ReadonlySet<Role> = new Set<Role>(['knight', 'bishop', 'queen']);

// What the piece on `at` would have done on `square`, safe there: a pin, or a piece attacked.
function threatOn(before: Board, [at, square]: [Square, Square], piece: Piece): Plan | null {
  if (!KEPT_OFF.has(piece.role) || !attackedSquares(before, at).includes(square)) return null;
  const there = boardAfter(before, `${at}${square}`);
  if (isHanging(there, square, piece)) return null;
  const threat = pressureOf(before, there, [at, square], piece.color);
  if (threat?.kind === 'pins')
    return { kind: 'prevents', piece, square, target: threat.piece, pin: true };
  if (threat?.kind === 'chases')
    return { kind: 'prevents', piece, square, target: threat.piece, pin: false };
  return null;
}

/** The other side's piece kept off a square it could go to, and what it would have done there. */
export function preventedOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
  color: Color,
): Plan | null {
  if (after.get(to)?.role !== 'pawn') return null;
  // A square the pawns held already, or one a piece stands on, wasn't the pawn's to take.
  const taken = attackedSquares(after, to).filter(
    square => !after.has(square) && !attackers(before, square, color).includes('pawn'),
  );
  for (const square of taken) {
    for (const [at, piece] of before) {
      if (piece.color !== opposite(color) || at === from) continue;
      const prevented = threatOn(before, [at, square], piece);
      if (prevented) return prevented;
    }
  }
  return null;
}
