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
import { between, firstPiece, isInBadSpot, pinOf } from '#page/review/chess/rays.ts';
import { batteryPlan, FILE_STEPS } from './battery.ts';
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

/**
 * A pawn of the other side's that the piece on `to` is the first to attack,
 * and nothing defends: a threat only if that piece can't be taken first.
 */
export function loosePawnOf(before: Board, after: Board, to: Square): Square | null {
  const mover = after.get(to);
  if (!mover || isInBadSpot(after, to)) return null;
  const them = opposite(mover.color);
  const loose = (square: Square): boolean => {
    const piece = after.get(square);
    return (
      piece?.role === 'pawn' &&
      piece.color === them &&
      attackers(after, square, them).length === 0 &&
      attackers(before, square, mover.color).length === 0
    );
  };
  return attackedSquares(after, to).find(loose) ?? null;
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

/** What a rook's move does: the seventh rank, rooks doubled on a file, a battery, an open file. */
export function rookPlan(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  if (onSeventh(after, to, color)) return { kind: 'seventhRank' };
  const [file] = squareCoords(to);
  if (pawnsOn(after, file, color).length > 0) return null;
  const partner = rooksOf(after, color).find(
    square => square !== to && squareCoords(square)[0] === file,
  );
  if (partner && clear(after, partner, to)) return { kind: 'doublesRooks' };
  const battery = batteryPlan(after, [from, to]);
  if (battery) return battery;
  const halfOpen = pawnsOn(after, file, opposite(color)).length > 0;
  return { kind: 'openFile', halfOpen, contested: faced(after, to, color) };
}

/** The queen come onto a file free of its pawns, to face a rook or the queen of the other side's there. */
export function contestsFile(
  after: Board,
  [from, to]: [Square, Square],
  color: Color,
): Plan | null {
  const [file] = squareCoords(to);
  if (squareCoords(from)[0] === file || pawnsOn(after, file, color).length > 0) return null;
  if (!faced(after, to, color)) return null;
  return {
    kind: 'openFile',
    halfOpen: pawnsOn(after, file, opposite(color)).length > 0,
    contested: true,
  };
}

// Whether a rook or queen of the other side's faces the piece on `to` along its file.
function faced(after: Board, to: Square, color: Color): boolean {
  return FILE_STEPS.some(step => {
    const ahead = firstPiece(after, to, step);
    return (
      ahead?.piece.color === opposite(color) &&
      (ahead.piece.role === 'rook' || ahead.piece.role === 'queen')
    );
  });
}

/** A pawn on its fourth rank in the center: d4 and e4 for White, d5 and e5 for Black. */
export function takesCenter(to: Square, color: Color): boolean {
  const [file] = squareCoords(to);
  return (file === 3 || file === 4) && ownRank(to, color) === 3;
}

/** A pawn on its fourth rank beside the center, at a central square: c4 and f4 for White. */
export function fightsCenter(to: Square, color: Color): boolean {
  const [file] = squareCoords(to);
  return (file === 2 || file === 5) && ownRank(to, color) === 3;
}

/** A pawn come to defend a central pawn of its own that no pawn defended. */
export function supportsCenter(before: Board, after: Board, to: Square, color: Color): boolean {
  const central = (board: Board, square: Square): boolean =>
    takesCenter(square, color) && board.get(square)?.role === 'pawn';
  return attackedSquares(after, to).some(
    square =>
      central(after, square) &&
      after.get(square)?.color === color &&
      !attackers(before, square, color).includes('pawn'),
  );
}
