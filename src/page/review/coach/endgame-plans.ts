import {
  attackedSquares,
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { isDefended } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { kingDistance } from './pawn-square.ts';
import { isEndgame, isPassed, ownRank, pawnsOn } from './structure.ts';

// Two plans of the endings: a pawn majority pushed on a wing, a rook that cuts
// the other king off from a passed pawn along a file.

const FILES = 'abcdefgh';

// The files of a wing: the queenside's a to d, the kingside's e to h.
const wingOf = (file: number): readonly number[] => (file <= 3 ? [0, 1, 2, 3] : [4, 5, 6, 7]);

const pawnsOnWing = (board: Board, files: readonly number[], color: Color): number =>
  files.reduce((count, file) => count + pawnsOn(board, file, color).length, 0);

/** A pawn pushed on a wing where its side has more pawns, its file free of the other side's. */
export function majorityOf(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const [file] = squareCoords(to);
  if (!isEndgame(after) || after.get(to)?.role !== 'pawn' || squareCoords(from)[0] !== file)
    return null;
  const files = wingOf(file);
  const mine = pawnsOnWing(after, files, color);
  const theirs = pawnsOnWing(after, files, opposite(color));
  const free = pawnsOn(after, file, opposite(color)).every(rank => {
    const square = squareAt(file, rank);
    return square === null || ownRank(square, color) < ownRank(to, color);
  });
  // A step from the second rank only gets the pawn going; the fourth rank is a push.
  if (theirs === 0 || mine <= theirs || !free || ownRank(to, color) < 3) return null;
  return { kind: 'majority', queenside: file <= 3, mine, theirs };
}

// The squares beside the king on the rook's file, which it may not step to.
function walls(board: Board, rook: Square, king: Square): boolean {
  const [file] = squareCoords(rook);
  const [, rank] = squareCoords(king);
  const seen = attackedSquares(board, rook);
  return [rank - 1, rank, rank + 1].every(row => {
    const square = squareAt(file, row);
    return square === null || square === rook || seen.includes(square);
  });
}

/** A rook come to a file between the other king and a passed pawn of its own. */
export function cutsOffOf(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const king = kingSquare(after, opposite(color));
  const [file] = squareCoords(to);
  if (!king || after.get(to)?.role !== 'rook' || squareCoords(from)[0] === file) return null;
  if (!isEndgame(after)) return null;
  // A king beside the rook takes it, unless it's defended.
  if (kingDistance(king, to) <= 1 && !isDefended(after, to, color)) return null;
  const kingFile = squareCoords(king)[0];
  const cut = [...after].some(
    ([square, piece]) =>
      piece.role === 'pawn' &&
      piece.color === color &&
      isPassed(after, square, color) &&
      (squareCoords(square)[0] - file) * (kingFile - file) < 0,
  );
  return cut && walls(after, to, king) ? { kind: 'cutsOff', file: FILES.charAt(file) } : null;
}
