import {
  type Board,
  type Color,
  kingSquare,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { between } from '#page/review/chess/rays.ts';
import { kingDistance, pawnEnding } from './pawn-square.ts';

// The opposition: in an ending of kings and pawns, the kings face to face on a
// file or a rank, one square between them. The side not to move must give way.

/** The two kings, when they stand in opposition. */
function opposedKings(board: Board): [Square, Square] | null {
  const white = kingSquare(board, 'white');
  const black = kingSquare(board, 'black');
  if (!white || !black || kingDistance(white, black) !== 2) return null;
  const [file, rank] = squareCoords(white);
  const [otherFile, otherRank] = squareCoords(black);
  return file === otherFile || rank === otherRank ? [white, black] : null;
}

/** A king's step that takes the opposition, for a side with a pawn to push through. */
export function takesOpposition(before: Board, after: Board, color: Color): boolean {
  const pawns = [...after.values()].some(
    ({ role, color: owner }) => role === 'pawn' && owner === color,
  );
  return (
    pawns && pawnEnding(after) && opposedKings(after) !== null && opposedKings(before) === null
  );
}

/** The kings in opposition, and the square between them. */
export function oppositionMarks(board: Board): Mark[] | null {
  const kings = opposedKings(board);
  if (!kings) return null;
  const [white, black] = kings;
  return [
    { kind: 'cells', squares: between(white, black), tone: 'plan' },
    { kind: 'ring', square: white, tone: 'plan' },
    { kind: 'ring', square: black, tone: 'plan' },
  ];
}
