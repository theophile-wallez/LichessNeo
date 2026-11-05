import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { ownRank } from './structure.ts';

// The Philidor defense of rook and pawn against rook: the defending king in
// front of the pawn, the rook on its third rank keeps the other king out,
// until the pawn steps up and the rook goes to check from behind.

// The pawn short of the defender's third rank: past it, the defense changes.
const PAWN_SHORT_OF = 5;

/** The pieces of `color` on `board`, kings aside. */
const piecesOf = (board: Board, color: Color) =>
  [...board].filter(([, piece]) => piece.color === color && piece.role !== 'king');

/**
 * A rook moved to its third rank in rook and pawn against rook, its king in
 * front of the pawn: the Philidor position.
 */
export function philidorOf(after: Board, [, to]: [Square, Square], color: Color): Plan | null {
  const them = opposite(color);
  const [ours, theirs] = [piecesOf(after, color), piecesOf(after, them)];
  const pawn = theirs.find(([, piece]) => piece.role === 'pawn')?.[0];
  const rooks = theirs.filter(([, piece]) => piece.role === 'rook').length;
  const king = kingSquare(after, color);
  if (ours.length !== 1 || ours[0]?.[1].role !== 'rook' || theirs.length !== 2 || rooks !== 1)
    return null;
  if (!pawn || !king || ownRank(to, color) !== 2 || ownRank(pawn, them) >= PAWN_SHORT_OF)
    return null;
  const [pawnFile] = squareCoords(pawn);
  const ahead = ownRank(king, them) > ownRank(pawn, them);
  const facing = Math.abs(squareCoords(king)[0] - pawnFile) <= 1;
  return ahead && facing ? { kind: 'philidor' } : null;
}
