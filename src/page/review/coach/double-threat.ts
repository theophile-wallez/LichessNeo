import {
  type Board,
  isInCheck,
  kingSquare,
  opposite,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { forkTargets } from '#page/review/chess/fork.ts';
import { mateInOne } from '#page/review/chess/mate-in-one.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';

// The engine's move that threatens mate and a piece at once: the mate
// parried, the piece falls, as its line shows. A check is a fork instead.

const samePiece = (first: Piece | undefined, second: Piece): boolean =>
  first?.role === second.role && first.color === second.color;

/** The piece the engine's move instead of `move` attacks while it threatens mate. */
export function doubleThreatOf(move: MoveVerdict): Piece | null {
  const plies = playLine(move.previousPosition.fen, move.before.line ?? []);
  const [first, , taking] = plies;
  if (!first || first.uci !== move.best || first.check || !taking) return null;
  const to = parseSquare(first.uci.slice(2, 4));
  if (!to || !mateInOne(first.after, move.color)) return null;
  const target = forkTargets(first.after, to).find(square => taking.uci.slice(2, 4) === square);
  return target === undefined ? null : (first.after.get(target) ?? null);
}

/** The lines of a double threat from the piece on `to`: to the piece, and to the mate. */
export function doubleThreatMarks(after: Board, to: Square, target: Piece): Mark[] | null {
  const color = after.get(to)?.color;
  if (!color || isInCheck(after, opposite(color))) return null;
  const square = forkTargets(after, to).find(each => samePiece(after.get(each), target));
  const mate = mateInOne(after, color);
  const king = kingSquare(after, opposite(color));
  if (!square || !mate || !king) return null;
  return [
    { kind: 'link', from: to, to: square, tone: 'attack' },
    { kind: 'link', from: mate.from, to: mate.to, tone: 'attack' },
    { kind: 'ring', square, tone: 'attack' },
    { kind: 'ring', square: king, tone: 'attack' },
  ];
}
