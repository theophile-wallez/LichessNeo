import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#shared/board/marks.ts';
import { between } from '#page/review/chess/rays.ts';
import { decidedEnding } from './endgame-rules.ts';
import { kingDistance, pawnEnding } from './pawn-square.ts';

// The opposition: in an ending of kings and pawns, the kings face to face on a
// file or a rank, one square between them, or three or five from afar. The
// side not to move must give way.

/** The two kings, when they stand face to face on a line, `distance` apart. */
function opposedKings(board: Board, distance = 2): [Square, Square] | null {
  const white = kingSquare(board, 'white');
  const black = kingSquare(board, 'black');
  if (!white || !black || kingDistance(white, black) !== distance) return null;
  const [file, rank] = squareCoords(white);
  const [otherFile, otherRank] = squareCoords(black);
  const line = file === otherFile || rank === otherRank;
  // Nothing between them: a pawn there blocks the kings' fight.
  return line && between(white, black).every(square => !board.has(square)) ? [white, black] : null;
}

// A pawn of the side to move that can step forward: a tempo in hand, and the opposition flips.
function spareTempo(board: Board, side: Color): boolean {
  return [...board].some(([square, piece]) => {
    if (piece.role !== 'pawn' || piece.color !== side) return false;
    const [file, rank] = squareCoords(square);
    const ahead = squareAt(file, rank + (side === 'white' ? 1 : -1));
    return ahead !== null && !board.has(ahead);
  });
}

// The kings fight over the pawns: one of them two squares from one at most.
function nearPawns(board: Board): boolean {
  const kings = [kingSquare(board, 'white'), kingSquare(board, 'black')];
  const pawns = [...board].filter(([, piece]) => piece.role === 'pawn').map(([square]) => square);
  return kings.some(king => king && pawns.some(pawn => kingDistance(king, pawn) <= 2));
}

// The distant opposition: three or five squares between the kings, odd as one.
// It decides endings of a pawn or two, not those with pawns on every wing.
const DISTANT = [4, 6];
const DISTANT_PAWNS = 4;

/**
 * A king's step of `color`'s that takes the opposition, to push a pawn
 * through or to keep the other king from doing so: face to face, or from
 * afar. Said while it matters: the other side has no pawn move to spare, and
 * no rule has decided the ending yet.
 */
export function takesOpposition(
  before: Board,
  after: Board,
  color: Color,
): 'opposition' | 'distantOpposition' | null {
  const pawns = [...after.values()].filter(({ role }) => role === 'pawn').length;
  if (pawns === 0 || !pawnEnding(after) || spareTempo(after, opposite(color))) return null;
  if (decidedEnding(before) || decidedEnding(after)) return null;
  if (opposedKings(after) && !opposedKings(before)) return nearPawns(after) ? 'opposition' : null;
  const few = pawns <= DISTANT_PAWNS;
  const far = few && DISTANT.some(distance => opposedKings(after, distance));
  const already = DISTANT.some(distance => opposedKings(before, distance));
  return far && !already ? 'distantOpposition' : null;
}

/** The kings in opposition, near or from afar, and the squares between them. */
export function oppositionMarks(board: Board): Mark[] | null {
  const kings = [2, ...DISTANT].map(distance => opposedKings(board, distance)).find(Boolean);
  if (!kings) return null;
  const [white, black] = kings;
  return [
    { kind: 'cells', squares: between(white, black), tone: 'plan' },
    { kind: 'ring', square: white, tone: 'plan' },
    { kind: 'ring', square: black, tone: 'plan' },
  ];
}
