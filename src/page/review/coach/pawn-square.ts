import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import type { Plan, Reason } from './idea.ts';
import { isPassed, ownRank } from './structure.ts';

// The rule of the square: in an ending of kings and pawns, a king catches a
// passed pawn only from inside its square, whose side runs from the pawn to
// its queening square, or by stepping into it on its move. A pawn on its
// first rank counts from the next, as it may push two.

interface Race {
  readonly pawn: Square;
  readonly color: Color;
  readonly king: Square;
  readonly queening: Square;
  /** The pawn's moves to queen, the square's side less one. */
  readonly moves: number;
  /** How far the king may stand from the queening square: one more on its move. */
  readonly reach: number;
}

export const kingDistance = (first: Square, second: Square): number => {
  const [file, rank] = squareCoords(first);
  const [otherFile, otherRank] = squareCoords(second);
  return Math.max(Math.abs(file - otherFile), Math.abs(rank - otherRank));
};

export const pawnEnding = (board: Board): boolean =>
  [...board.values()].every(({ role }) => role === 'pawn' || role === 'king');

/** The squares the pawn has yet to cross, the queening square last. */
export function pathOf(pawn: Square, color: Color): Square[] {
  const [file, rank] = squareCoords(pawn);
  const step = color === 'white' ? 1 : -1;
  return Array.from({ length: 7 - ownRank(pawn, color) }, (_, i) => i + 1).flatMap(
    ahead => squareAt(file, rank + step * ahead) ?? [],
  );
}

// The race of `color`'s pawn on `pawn` to queen, with `toMove` to play: none
// unless it's a passed pawn with its path clear in a pawn ending.
function raceOf(board: Board, pawn: Square, toMove: Color): Race | null {
  const piece = board.get(pawn);
  if (piece?.role !== 'pawn' || !pawnEnding(board) || !isPassed(board, pawn, piece.color))
    return null;
  const { color } = piece;
  const king = kingSquare(board, opposite(color));
  const path = pathOf(pawn, color);
  const queening = path.at(-1);
  if (!king || !queening || path.some(square => board.has(square))) return null;
  const moves = 7 - Math.max(ownRank(pawn, color), 2);
  return { pawn, color, king, queening, moves, reach: moves + (toMove === color ? 0 : 1) };
}

const caught = ({ king, queening, reach }: Race): boolean => kingDistance(king, queening) <= reach;

/** `color`'s most advanced pawn on `file`, a passed pawn racing to queen. */
function racingOn(board: Board, file: number, color: Color, toMove: Color): Race | null {
  const pawns = [...board]
    .filter(
      ([square, piece]) =>
        piece.role === 'pawn' && piece.color === color && squareCoords(square)[0] === file,
    )
    .map(([square]) => square)
    .toSorted((first, second) => ownRank(second, color) - ownRank(first, color));
  const [pawn] = pawns;
  return pawn ? raceOf(board, pawn, toMove) : null;
}

/** A pawn pushed out of reach of the other king. */
export function outruns(after: Board, to: Square, color: Color, made: boolean): Plan | null {
  const race = raceOf(after, to, opposite(color));
  if (!race || caught(race)) return null;
  return {
    kind: 'outruns',
    file: squareCoords(to)[0],
    king: { role: 'king', color: opposite(color) },
    made,
  };
}

/** The king's step into the square of a pawn it stood next to, just in time. */
export function entersSquare(before: Board, after: Board, color: Color): Plan | null {
  const them = opposite(color);
  for (const [square, piece] of after) {
    if (piece.role !== 'pawn' || piece.color !== them) continue;
    const was = raceOf(before, square, color);
    const now = raceOf(after, square, them);
    const edge = was !== null && kingDistance(was.king, was.queening) === was.reach;
    if (edge && now && caught(now))
      return {
        kind: 'entersSquare',
        file: squareCoords(square)[0],
        king: { role: 'king', color },
      };
  }
  return null;
}

type RaceReason = Extract<Reason, { readonly kind: 'outruns' | 'entersSquare' }>;

const raceFor = (reason: RaceReason, board: Board, toMove: Color): Race | null =>
  racingOn(board, reason.file, opposite(reason.king.color), toMove);

/** Whether the pawn of a reason of the rule's was already out of reach, `toMove` to play. */
export const outOfReach = (reason: RaceReason, board: Board, toMove: Color): boolean => {
  const race = raceFor(reason, board, toMove);
  return race !== null && !caught(race);
};

/**
 * The pawn's square of a reason of the rule's, on the board shown, `toMove`
 * to play, and its king ringed: in time to catch the pawn, or not.
 */
export function squareMarks(reason: RaceReason, board: Board, toMove: Color): Mark[] | null {
  const race = raceFor(reason, board, toMove);
  if (!race) return null;
  const [file, queeningRank] = squareCoords(race.queening);
  const [kingFile] = squareCoords(race.king);
  // Toward the king, or toward the wider side when it stands on the pawn's file.
  const side = kingFile > file || (kingFile === file && file < 4) ? 1 : -1;
  const span = race.moves;
  const near = squareAt(file, queeningRank + (race.color === 'white' ? -span : span));
  const far = squareAt(Math.min(7, Math.max(0, file + side * span)), queeningRank);
  if (!near || !far) return null;
  return [
    { kind: 'area', from: near, to: far },
    { kind: 'ring', square: race.king, tone: caught(race) ? 'defense' : 'attack' },
  ];
}
