import {
  type Board,
  type Color,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { isEndgame, isPassed, pawnsOn } from './structure.ts';

// What makes a passed pawn worth more: a neighbor passed too, a pawn guarding
// it, or, in an endgame, the other side's pawns far away, which lures their
// king off to stop it.

export type PassedTrait = 'connected' | 'protected' | 'outside';

// The files between an outside passed pawn and the other side's nearest pawn.
const OUTSIDE_FILES = 3;

/** `color`'s passed pawns on `board`. */
export const passedPawns = (board: Board, color: Color): Square[] =>
  [...board].flatMap(([square, piece]) =>
    piece.role === 'pawn' && piece.color === color && isPassed(board, square, color)
      ? [square]
      : [],
  );

const isPawnOf = (board: Board, square: Square | null, color: Color): boolean => {
  const piece = square ? board.get(square) : undefined;
  return piece?.role === 'pawn' && piece.color === color;
};

function guarded(board: Board, pawn: Square, color: Color): boolean {
  const [file, rank] = squareCoords(pawn);
  const behind = rank + (color === 'white' ? -1 : 1);
  return [file - 1, file + 1].some(side => isPawnOf(board, squareAt(side, behind), color));
}

function connected(board: Board, pawn: Square, color: Color): boolean {
  const [file] = squareCoords(pawn);
  return passedPawns(board, color).some(other => Math.abs(squareCoords(other)[0] - file) === 1);
}

function outside(board: Board, pawn: Square, color: Color): boolean {
  const [file] = squareCoords(pawn);
  const theirs = [0, 1, 2, 3, 4, 5, 6, 7].filter(
    other => pawnsOn(board, other, opposite(color)).length > 0,
  );
  return (
    isEndgame(board) &&
    theirs.length > 0 &&
    theirs.every(other => Math.abs(other - file) >= OUTSIDE_FILES)
  );
}

function traitOf(board: Board, pawn: Square, color: Color): PassedTrait | null {
  if (!isPassed(board, pawn, color)) return null;
  if (connected(board, pawn, color)) return 'connected';
  if (guarded(board, pawn, color)) return 'protected';
  return outside(board, pawn, color) ? 'outside' : null;
}

/**
 * The plan of a pawn passed after its move from `from` to `to`, with what
 * makes it strong when the move gave it that: a pair pushed on is said once.
 */
export function passedPlan(
  play: { before: Board; after: Board; color: Color },
  [from, to]: [Square, Square],
  made: boolean,
): Plan {
  const { before, after, color } = play;
  const trait = traitOf(after, to, color);
  const kept = trait !== null && traitOf(before, from, color) === trait;
  return { kind: 'passedPawn', made, trait: kept ? null : trait };
}
