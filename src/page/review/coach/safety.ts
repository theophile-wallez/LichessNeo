import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  kingSquare,
  opposite,
  PIECE_VALUES,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { isHanging } from '#page/review/chess/material.ts';
import { between } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { isPassed, ownRank } from './structure.ts';
import { whichOne } from './which-one.ts';

// What a move does for the mover's own pieces: one taken out of danger, one
// defended, a rook behind a passed pawn, a knight to the center, a square for
// the king to breathe.

const CENTER = new Set(['33', '34', '43', '44']);

/** Whether `color`'s piece on `square`, not a pawn nor the king, could be won. */
function inDanger(board: Board, square: Square, color: Color): boolean {
  const piece = board.get(square);
  if (!piece || piece.color !== color || piece.role === 'pawn' || piece.role === 'king')
    return false;
  return isHanging(board, square, piece);
}

/** The piece moved out of danger, or the most valuable one it now defends. */
export function safetyPlan(before: Board, after: Board, [from, to]: [Square, Square]): Plan | null {
  const piece = after.get(to);
  if (!piece) return null;
  if (inDanger(before, from, piece.color) && !inDanger(after, to, piece.color))
    return { kind: 'saves', piece };
  const guarded = attackedSquares(after, to)
    .filter(
      square => inDanger(before, square, piece.color) && !inDanger(after, square, piece.color),
    )
    .flatMap(square => after.get(square) ?? [])
    .toSorted((first, second) => PIECE_VALUES[second.role] - PIECE_VALUES[first.role]);
  const [most] = guarded;
  return most ? { kind: 'guards', piece: most } : null;
}

/**
 * What a pawn's move defends: the most valuable piece or pawn of its own it
 * now covers that was there to be won, by its square when it's one of several.
 */
export function pawnGuards(before: Board, after: Board, to: Square): Plan | null {
  const pawn = after.get(to);
  if (!pawn) return null;
  const covered = attackedSquares(after, to)
    .flatMap(square => {
      const piece = after.get(square);
      if (piece?.color !== pawn.color || piece.role === 'king') return [];
      const won = isHanging(before, square, piece) && !isHanging(after, square, piece);
      return won ? [{ square, piece }] : [];
    })
    .toSorted((first, second) => PIECE_VALUES[second.piece.role] - PIECE_VALUES[first.piece.role]);
  const [most] = covered;
  if (!most) return null;
  const which = whichOne(after, most.square, most.piece);
  return which === null
    ? { kind: 'guards', piece: most.piece }
    : { kind: 'guards', piece: most.piece, square: which };
}

/** A rook come behind a passed pawn of its own, nothing between them. */
export function behindPasser(after: Board, to: Square, color: Color): boolean {
  const [file] = squareCoords(to);
  return [...after].some(
    ([square, piece]) =>
      piece.role === 'pawn' &&
      piece.color === color &&
      squareCoords(square)[0] === file &&
      ownRank(square, color) > ownRank(to, color) &&
      isPassed(after, square, color) &&
      between(to, square).every(step => !after.has(step)),
  );
}

/** A knight on d4, e4, d5 or e5. */
export const centralSquare = (square: Square): boolean => CENTER.has(squareCoords(square).join(''));

/**
 * A pawn pushed from in front of its castled king, on the back rank with no
 * square off it: a king still in the center has other ways out. The square it
 * leaves must be safe, or the king gains nothing.
 */
export function makesLuft(before: Board, [from, to]: [Square, Square], color: Color): boolean {
  const king = kingSquare(before, color);
  if (!king || ownRank(king, color) !== 0 || ownRank(from, color) !== 1) return false;
  const [kingFile, kingRank] = squareCoords(king);
  if (kingFile === 3 || kingFile === 4) return false;
  const ahead = kingRank + (color === 'white' ? 1 : -1);
  const exits = [kingFile - 1, kingFile, kingFile + 1].flatMap(file => squareAt(file, ahead) ?? []);
  const shut = exits.every(square => before.get(square)?.color === color);
  if (!shut || !exits.includes(from) || squareCoords(to)[0] !== squareCoords(from)[0]) return false;
  const after = new Map(before);
  const pawn = after.get(from);
  after.delete(from);
  if (pawn) after.set(to, pawn);
  return attackers(after, from, opposite(color)).length === 0;
}
