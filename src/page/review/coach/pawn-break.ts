import {
  attackedSquares,
  attackers,
  type Board,
  type Color,
  opposite,
  parseSquare,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';

// A pawn break: a pawn pushed to hit a pawn of the other side's that a pawn
// holds, a chain's. At its base, the pawn no pawn holds, it hits the chain
// where it's weakest. In the center, with the other king still home, it opens
// lines on the king.

const heldByPawn = (board: Board, square: Square, color: Color): boolean =>
  attackers(board, square, color).includes('pawn');

/** Whether `color`'s pawn on `square` holds another pawn of its own. */
const holdsPawn = (board: Board, square: Square, color: Color): boolean =>
  attackedSquares(board, square).some(at => {
    const piece = board.get(at);
    return piece?.role === 'pawn' && piece.color === color;
  });

const KING_HOME: Record<Color, Square | null> = {
  white: parseSquare('e1'),
  black: parseSquare('e8'),
};
const CENTER_FILES: ReadonlySet<number> = new Set([2, 3, 4, 5]);

const kingOn = (board: Board, square: Square | null, color: Color): boolean => {
  const there = square ? board.get(square) : undefined;
  return there?.role === 'king' && there.color === color;
};

/**
 * The `color` king still on its square, when the pawn on `to` breaks in the
 * center, c- to f-file, and the side breaking has its own king away from it.
 */
function kingAtHome(board: Board, to: Square, color: Color): Square | null {
  const home = KING_HOME[color];
  const central = CENTER_FILES.has(squareCoords(to)[0]);
  const castled = !kingOn(board, KING_HOME[opposite(color)], opposite(color));
  return home && central && castled && kingOn(board, home, color) ? home : null;
}

/** The pushed pawn on `to` hitting a chain of the other side's: at its base, or a pawn in it. */
export function pawnBreakOf(after: Board, to: Square, color: Color): Plan | null {
  const them = opposite(color);
  const chain = attackedSquares(after, to).filter(square => {
    const piece = after.get(square);
    if (piece?.role !== 'pawn' || piece.color !== them) return false;
    return heldByPawn(after, square, them) || holdsPawn(after, square, them);
  });
  const base = chain.find(
    square => !heldByPawn(after, square, them) && holdsPawn(after, square, them),
  );
  const king = kingAtHome(after, to, them);
  if (base) return { kind: 'pawnBreak', square: base, base: true, king };
  const [hit] = chain;
  return hit ? { kind: 'pawnBreak', square: hit, base: false, king } : null;
}
