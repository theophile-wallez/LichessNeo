import {
  attackedSquares,
  type Board,
  type Piece,
  type Role,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { between } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';
import { ownRank } from './structure.ts';

// A move that clears the way for a bishop, rook or queen of its own behind it.
// Only a line that runs on into the other side's half counts: a few more
// squares at home give the slider nothing to do.

const SLIDERS: ReadonlySet<Role> = new Set<Role>(['bishop', 'rook', 'queen']);

// The squares a slider must gain past the square left, and how many of them in
// the other side's half.
const GAINED = 3;
const FAR = 2;

type OpenedLine = Extract<Plan, { readonly kind: 'opensLine' }>;

function lineOf(slider: Square, through: Square): OpenedLine['line'] {
  const [file, rank] = squareCoords(slider);
  const [otherFile, otherRank] = squareCoords(through);
  if (file === otherFile) return 'file';
  return rank === otherRank ? 'rank' : 'diagonal';
}

const usesLine = (piece: Piece | undefined, line: OpenedLine['line']): boolean =>
  piece?.role === 'queen' || piece?.role === (line === 'diagonal' ? 'bishop' : 'rook');

/** The slider of the mover's that gains the most along the line the move left. */
export function openedLineOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
): OpenedLine | null {
  const mover = after.get(to);
  const color = mover?.color;
  const opened = [...after]
    .flatMap(([square, slider]) => {
      if (square === to || slider.color !== color || !SLIDERS.has(slider.role)) return [];
      const was = attackedSquares(before, square);
      // A slider moved off the line was using it already, as the front of a battery.
      if (!was.includes(from) || usesLine(mover, lineOf(square, from))) return [];
      const gained = attackedSquares(after, square).filter(
        seen => !was.includes(seen) && between(square, seen).includes(from),
      );
      const far = gained.filter(seen => ownRank(seen, slider.color) >= 4).length;
      return gained.length >= GAINED && far >= FAR
        ? [{ square, slider, gained: gained.length }]
        : [];
    })
    .toSorted((first, second) => second.gained - first.gained);
  const [best] = opened;
  return best
    ? { kind: 'opensLine', slider: best.slider, from: best.square, line: lineOf(best.square, from) }
    : null;
}
