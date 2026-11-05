import {
  attackedSquares,
  type Board,
  type Color,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { isEndgame, ownRank } from './structure.ts';

// A pawn's move that gives a bishop short of squares to step back to one more:
// h3 frees h2 for a bishop on f4, which a knight on h5 then can't trade off;
// a3 frees a2 for one on c4, out of a knight's reach on a5.

const FEW_RETREATS = 1;
// The pushes played for it, from the pawn's first square: h3, a3 or a4, c3
// (and Black's). An f-pawn's push, or h4, has another point: the center, an attack.
const RETREAT_FILES: ReadonlySet<number> = new Set([0, 2, 7]);
const A_FILE = 0;

function pushedForIt(from: Square, to: Square, color: Color): boolean {
  const [file, rank] = squareCoords(from);
  const step = Math.abs(squareCoords(to)[1] - rank);
  const start = ownRank(from, color) === 1;
  return start && RETREAT_FILES.has(file) && (step === 1 || file === A_FILE);
}

/** The empty squares a bishop on `square` can step back to, toward its side's back rank. */
function retreats(board: Board, square: Square, color: Color): Square[] {
  const [file, rank] = squareCoords(square);
  const back = color === 'white' ? -1 : 1;
  return [-1, 1].flatMap(side => {
    const squares: Square[] = [];
    let next = squareAt(file + side, rank + back);
    while (next && !board.has(next)) {
      squares.push(next);
      next = squareAt(file + side * (squares.length + 1), rank + back * (squares.length + 1));
    }
    return squares;
  });
}

// A push that backs up a piece of its own (a4 under a knight on b5) is played for that.
const backsPiece = (board: Board, to: Square, color: Color): boolean =>
  attackedSquares(board, to).some(square => {
    const piece = board.get(square);
    return piece?.color === color && piece.role !== 'pawn' && piece.role !== 'king';
  });

/** The pawn's square, freed for a developed bishop of its side that had few retreats. */
export function retreatOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
  color: Color,
): Plan | null {
  if (isEndgame(after) || !pushedForIt(from, to, color) || backsPiece(after, to, color))
    return null;
  for (const [square, piece] of after) {
    if (piece.role !== 'bishop' || piece.color !== color || ownRank(square, color) === 0) continue;
    const had = retreats(before, square, color);
    if (had.length <= FEW_RETREATS && retreats(after, square, color).includes(from))
      return { kind: 'makesRetreat', piece, square: from };
  }
  return null;
}
