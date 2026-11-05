import {
  type Board,
  type Color,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';
import { takesOpposition } from './opposition.ts';
import { entersSquare, kingDistance, pathOf } from './pawn-square.ts';
import { passedPawns } from './passed-pawns.ts';
import { pawnTargetOf } from './pressure.ts';
import { centerDistance, isEndgame, ownRank } from './structure.ts';

// What a king's step does in an ending: the rule of the square, the
// opposition, a pawn it goes after, its own passed pawn escorted, the other
// side's stopped, and only then the center, said once, as the king gets there.

// The squares no further from the board's middle than c3 to f6.
const CENTER_ZONE = 1.5;

interface KingStep {
  readonly before: Board;
  readonly after: Board;
  readonly color: Color;
  readonly from: Square;
  readonly to: Square;
}

// The square a pawn steps to next.
function aheadOf(pawn: Square, color: Color): Square | null {
  const [file, rank] = squareCoords(pawn);
  return squareAt(file, rank + (color === 'white' ? 1 : -1));
}

// Its own passed pawn whose next square the king comes beside, not in front of
// it on its file, where it would block it: the furthest on, if several.
function escortOf({ after, color, from, to }: KingStep): Plan | null {
  const escorted = passedPawns(after, color)
    .filter(pawn => {
      const next = aheadOf(pawn, color);
      if (!next) return false;
      const blocks =
        squareCoords(to)[0] === squareCoords(pawn)[0] && ownRank(to, color) > ownRank(pawn, color);
      return !blocks && kingDistance(to, next) <= 1 && kingDistance(from, next) > 1;
    })
    .toSorted((first, second) => ownRank(second, color) - ownRank(first, color));
  const [square] = escorted;
  const pawn = square && after.get(square);
  return square && pawn ? { kind: 'escorts', pawn, square } : null;
}

// How far the king on `king` stands from the pawn's road to queening.
const roadDistance = (king: Square, pawn: Square, color: Color): number =>
  Math.min(...pathOf(pawn, color).map(square => kingDistance(king, square)));

// The other side's furthest passed pawn, when the king comes next to its road,
// ahead of it: one further back can wait.
function stopOf({ after, color, from, to }: KingStep): Plan | null {
  const them = opposite(color);
  const [square] = passedPawns(after, them).toSorted(
    (first, second) => ownRank(second, them) - ownRank(first, them),
  );
  const stops =
    square !== undefined &&
    ownRank(to, them) > ownRank(square, them) &&
    roadDistance(to, square, them) <= 1 &&
    roadDistance(from, square, them) > 1;
  const pawn = stops && after.get(square);
  return stops && pawn ? { kind: 'stopsPasser', pawn, square } : null;
}

// A pawn of the other side's that nothing defends, which the king now attacks.
function huntOf({ before, after, to }: KingStep): Plan | null {
  const target = pawnTargetOf(before, after, to);
  const pawn = target && after.get(target.square);
  return target && pawn ? { kind: 'attacksPawn', piece: pawn, square: target.square } : null;
}

const entersCenter = (from: Square, to: Square): boolean =>
  centerDistance(to) <= CENTER_ZONE && centerDistance(from) > CENTER_ZONE;

/** What the king's step from `from` to `to` does, in an ending. */
export function kingPlan(step: KingStep): Plan | null {
  const { before, after, color } = step;
  const enters = entersSquare(before, after, color);
  if (enters) return enters;
  if (takesOpposition(before, after, color)) return { kind: 'opposition' };
  if (!isEndgame(after)) return null;
  return (
    huntOf(step) ??
    escortOf(step) ??
    stopOf(step) ??
    (entersCenter(step.from, step.to) ? { kind: 'centralKing' } : null)
  );
}
