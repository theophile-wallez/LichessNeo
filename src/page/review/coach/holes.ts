import {
  type Board,
  type Color,
  opposite,
  parseSquare,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { isEndgame, pawnCanHit } from './structure.ts';

// A hole: a pawn's push leaves a square in front of its side's camp that no
// pawn of its own can ever hit again, and a knight of the other side's can
// come and sit there.

// The squares that count: the c- to f-files, on the side's third and fourth ranks.
const FILES = [2, 3, 4, 5];
const RANKS = [2, 3];
const KNIGHT_JUMPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
] as const;

const jumps = (square: Square): Square[] => {
  const [file, rank] = squareCoords(square);
  return KNIGHT_JUMPS.flatMap(([x, y]) => squareAt(file + x, rank + y) ?? []);
};

/** Whether a knight of `color` stands two jumps from `square` at most. */
function knightNear(board: Board, square: Square, color: Color): boolean {
  const near = new Set([square, ...jumps(square)]);
  for (const step of jumps(square)) for (const next of jumps(step)) near.add(next);
  return [...near].some(at => {
    const piece = board.get(at);
    return piece?.role === 'knight' && piece.color === color;
  });
}

function holeOf(before: Board, after: Board, color: Color): Square | null {
  const them = opposite(color);
  for (const rank of RANKS)
    for (const file of FILES) {
      const square = squareAt(file, color === 'white' ? rank : 7 - rank);
      if (!square || after.get(square)?.role === 'pawn') continue;
      const made = pawnCanHit(before, square, color) && !pawnCanHit(after, square, color);
      if (made && knightNear(after, square, them)) return square;
    }
  return null;
}

/** An error, a pawn's push, that leaves a hole in front of the mover's camp. */
export function holeFact({ move, facts, me, before, after }: FactInput): Fact | null {
  const from = parseSquare(move.uci.slice(0, 2));
  if (!from || before.get(from)?.role !== 'pawn' || isEndgame(after)) return null;
  const hole = holeOf(before, after, me);
  return hole ? said(oneOf(facts.hole(squareToken(hole)), move)) : null;
}
