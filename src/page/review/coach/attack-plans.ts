import {
  type Board,
  type Color,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { isEndgame, ownRank, pawnsOn } from './structure.ts';

// The attack on a castled king: a pawn storm when the kings castled on
// opposite wings, a rook lifted to the third rank to swing over to the king.
// And on the queenside's pawns: the minority attack.

const FILES = 'abcdefgh';
const KINGSIDE = [5, 6, 7];
const QUEENSIDE = [0, 1, 2];

const kingOf = (board: Board, color: Color): Square | null =>
  [...board].find(([, piece]) => piece.role === 'king' && piece.color === color)?.[0] ?? null;

/** The files of the wing `color`'s king castled to, still on its first two ranks. */
export function castledWing(board: Board, color: Color): readonly number[] | null {
  const king = kingOf(board, color);
  if (!king || ownRank(king, color) > 1) return null;
  const [file] = squareCoords(king);
  if (KINGSIDE.includes(file)) return KINGSIDE;
  return QUEENSIDE.includes(file) ? QUEENSIDE : null;
}

// The attack needs pieces to back it: a middlegame with a queen of the attacker's.
const attacking = (board: Board, color: Color): boolean =>
  !isEndgame(board) &&
  [...board.values()].some(({ role, color: owner }) => role === 'queen' && owner === color);

/** A pawn pushed, kings on opposite wings, at the other king: on its fourth rank or past it. */
export function stormOf(after: Board, [, to]: [Square, Square], color: Color): Plan | null {
  const theirs = castledWing(after, opposite(color));
  const [file] = squareCoords(to);
  if (!theirs || !oppositeWings(after, color)) return null;
  return theirs.includes(file) && ownRank(to, color) >= 3
    ? { kind: 'storm', file: FILES.charAt(file) }
    : null;
}

/** Whether the rook on `square` sees, along its rank, a square of `wing`'s files. */
function swingsTo(board: Board, square: Square, wing: readonly number[]): boolean {
  const [file, rank] = squareCoords(square);
  if (wing.includes(file)) return true;
  const step = (wing[0] ?? 0) > file ? 1 : -1;
  for (let next = file + step; next >= 0 && next < 8; next += step) {
    const on = squareAt(next, rank);
    if (!on || board.has(on)) return false;
    if (wing.includes(next)) return true;
  }
  return false;
}

/** A rook come up its file to the third rank, from where it can swing over to the castled king. */
export function rookLiftOf(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const wing = castledWing(after, opposite(color));
  const lifted = ownRank(to, color) === 2 && ownRank(from, color) < 2;
  if (!wing || !lifted || squareCoords(from)[0] !== squareCoords(to)[0]) return null;
  return attacking(after, color) && swingsTo(after, to, wing) ? { kind: 'rookLift' } : null;
}

const pawnsOnWing = (board: Board, color: Color): number =>
  QUEENSIDE.reduce((count, file) => count + pawnsOn(board, file, color).length, 0);

/**
 * The minority attack: the b-pawn pushed on to its fourth rank or past it,
 * two pawns against three on the queenside, at the other side's c-pawn, to
 * leave it weak once the pawns trade.
 */
export function minorityAttackOf(
  after: Board,
  [, to]: [Square, Square],
  color: Color,
): Plan | null {
  const them = opposite(color);
  if (squareCoords(to)[0] !== 1 || ownRank(to, color) < 3 || isEndgame(after)) return null;
  const ours = pawnsOnWing(after, color);
  const minority = ours === 2 && pawnsOnWing(after, them) === 3;
  // A chain to hit, as in the Carlsbad: their c- and d-pawns against a d-pawn of ours.
  const chain = [2, 3].every(file => pawnsOn(after, file, them).length > 0);
  return minority && chain && pawnsOn(after, 3, color).length > 0
    ? { kind: 'minorityAttack' }
    : null;
}

/** Whether the kings stand on opposite wings, a middlegame's, queens on: the pawn storms' race. */
export function oppositeWings(board: Board, color: Color): boolean {
  const [ours, theirs] = [castledWing(board, color), castledWing(board, opposite(color))];
  return ours !== null && theirs !== null && ours !== theirs && attacking(board, color);
}
