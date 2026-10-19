import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  opposite,
  PIECE_VALUES,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { between, pinOf } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { ownRank, pawnsOn } from './structure.ts';

// What a move does to the other side's pieces, and what a rook's does on its
// file or rank.

/** A piece of the other side's the move pins, or newly attacks when it's worth more or undefended. */
export function pressureOf(after: Board, to: Square, color: Color): Plan | null {
  const them = opposite(color);
  for (const [square, piece] of after) {
    if (piece.color !== them || piece.role === 'pawn') continue;
    const pin = pinOf(after, square, true);
    const behind = pin?.pinner === to ? after.get(pin.behind) : undefined;
    if (behind) return { kind: 'pins', piece, behind };
  }
  const mover = after.get(to);
  if (!mover) return null;
  for (const square of attackedSquares(after, to)) {
    const piece = after.get(square);
    if (piece?.color !== them || piece.role === 'king' || piece.role === 'pawn') continue;
    const loose = attackers(after, square, them).length === 0;
    if (PIECE_VALUES[piece.role] > PIECE_VALUES[mover.role] || loose)
      return { kind: 'chases', piece };
  }
  return null;
}

/** The squares of `color`'s rooks. */
const rooksOf = (board: Board, color: Color): Square[] =>
  [...board].flatMap(([square, piece]) =>
    piece.role === 'rook' && piece.color === color ? [square] : [],
  );

const clear = (board: Board, from: Square, to: Square): boolean =>
  between(from, to).every(square => !board.has(square));

/** Whether `color`'s two rooks stand on its back rank with nothing between them. */
export function rooksConnected(board: Board, color: Color): boolean {
  const [first, second] = rooksOf(board, color);
  if (!first || !second || ownRank(first, color) !== 0 || ownRank(second, color) !== 0)
    return false;
  return clear(board, first, second);
}

// The seventh rank counts with pawns of the other side's on it, or its king behind it.
const onSeventh = (after: Board, to: Square, color: Color): boolean =>
  ownRank(to, color) === 6 &&
  [...after].some(
    ([square, piece]) =>
      piece.color !== color &&
      ((piece.role === 'pawn' && ownRank(square, color) === 6) ||
        (piece.role === 'king' && ownRank(square, color) === 7)),
  );

/** What a rook's move does: the seventh rank, rooks doubled on a file, an open file. */
export function rookPlan(after: Board, to: Square, color: Color): Plan | null {
  if (onSeventh(after, to, color)) return { kind: 'seventhRank' };
  const [file] = squareCoords(to);
  if (pawnsOn(after, file, color).length > 0) return null;
  const partner = rooksOf(after, color).find(
    square => square !== to && squareCoords(square)[0] === file,
  );
  if (partner && clear(after, partner, to)) return { kind: 'doublesRooks' };
  return { kind: 'openFile', halfOpen: pawnsOn(after, file, opposite(color)).length > 0 };
}

/** A pawn on its fourth rank in the center: d4 and e4 for White, d5 and e5 for Black. */
export function takesCenter(to: Square, color: Color): boolean {
  const [file] = squareCoords(to);
  return (file === 3 || file === 4) && ownRank(to, color) === 3;
}
