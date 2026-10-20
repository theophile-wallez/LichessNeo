import {
  attackedSquares,
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Role,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { firstPiece } from '#page/review/chess/rays.ts';
import type { Plan, Reason } from './idea.ts';
import { pawnsOn } from './structure.ts';

// A battery: the piece moved lines up with another of its own that slides the
// same way, a rook and the queen on a file free of their pawns, a bishop and
// the queen on a diagonal aimed at the other side. Two rooks are doubled
// rooks (pressure.ts); a piece lined up behind one that has to step aside is a
// discovery (discovery.ts).

type Step = readonly [number, number];

export const FILE_STEPS: readonly Step[] = [
  [0, 1],
  [0, -1],
];
const DIAGONAL_STEPS: readonly Step[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// The piece each slider pairs with, on each kind of line.
const FILE_PARTNERS: Partial<Record<Role, Role>> = { rook: 'queen', queen: 'rook' };
const DIAGONAL_PARTNERS: Partial<Record<Role, Role>> = { bishop: 'queen', queen: 'bishop' };

interface Aim {
  /** The piece of the other side's the diagonal is aimed at. */
  readonly target: Square;
  /** The battery's piece farther from it. */
  readonly back: Square;
}

interface Lined {
  readonly partner: Square;
  readonly aim: Aim | null;
}

/** The step from `from` to `to`, a king's step along their line. */
function stepOf(from: Square, to: Square): Step {
  const [fromFile, fromRank] = squareCoords(from);
  const [toFile, toRank] = squareCoords(to);
  return [Math.sign(toFile - fromFile), Math.sign(toRank - fromRank)];
}

// Whether the move slid along the line: then it was lined up already.
function along(from: Square | null, to: Square, step: Step): boolean {
  if (!from) return false;
  const [fileStep, rankStep] = stepOf(to, from);
  return Math.abs(fileStep) === Math.abs(step[0]) && Math.abs(rankStep) === Math.abs(step[1]);
}

/** The partner on `step` from `to`, for a slider of `role`. */
function partnerOn(after: Board, to: Square, step: Step, partners: Partial<Record<Role, Role>>) {
  const mover = after.get(to);
  const ahead = firstPiece(after, to, step);
  if (!mover || ahead?.piece.color !== mover.color) return null;
  return partners[mover.role] === ahead.piece.role ? ahead.square : null;
}

// The other side's piece the diagonal is aimed at, past either end: a piece, or
// a pawn by its king, what a bishop and queen battery comes for.
function aimedAt(after: Board, ends: readonly [Square, Square], color: Color): Aim | null {
  const king = kingSquare(after, opposite(color));
  for (const [front, back] of [ends, [ends[1], ends[0]] as const]) {
    const hit = firstPiece(after, front, stepOf(back, front));
    if (hit?.piece.color !== opposite(color)) continue;
    if (hit.piece.role !== 'pawn' || (king !== null && near(hit.square, king)))
      return { target: hit.square, back };
  }
  return null;
}

/** Whether two squares touch. */
function near(first: Square, second: Square): boolean {
  const [file, rank] = squareCoords(first);
  const [otherFile, otherRank] = squareCoords(second);
  return Math.max(Math.abs(file - otherFile), Math.abs(rank - otherRank)) <= 1;
}

/** The battery the piece on `to` makes, a new one when it came `from` there. */
function linedUp(after: Board, to: Square, from: Square | null): Lined | null {
  const color = after.get(to)?.color;
  if (!color) return null;
  const [file] = squareCoords(to);
  if (pawnsOn(after, file, color).length === 0)
    for (const step of FILE_STEPS) {
      const partner = partnerOn(after, to, step, FILE_PARTNERS);
      if (partner && !along(from, to, step)) return { partner, aim: null };
    }
  for (const step of DIAGONAL_STEPS) {
    const partner = partnerOn(after, to, step, DIAGONAL_PARTNERS);
    const aim = partner && !along(from, to, step) ? aimedAt(after, [to, partner], color) : null;
    if (partner && aim) return { partner, aim };
  }
  return null;
}

/** The battery a move makes, as a plan. */
export function batteryPlan(after: Board, [from, to]: readonly [Square, Square]): Plan | null {
  const lined = linedUp(after, to, from);
  const mover = after.get(to);
  const partner = lined && after.get(lined.partner);
  if (!lined || !mover || !partner) return null;
  const target = lined.aim && after.get(lined.aim.target);
  if (target) return { kind: 'diagonalBattery', mover, partner, target };
  const [file] = squareCoords(to);
  const halfOpen = pawnsOn(after, file, opposite(mover.color)).length > 0;
  return { kind: 'fileBattery', mover, partner, halfOpen };
}

/** The empty squares from `from` on `step`, up to the first piece. */
function emptyRun(after: Board, from: Square, [fileStep, rankStep]: Step): Square[] {
  const [file, rank] = squareCoords(from);
  const squares: Square[] = [];
  for (let k = 1; ; k++) {
    const square = squareAt(file + fileStep * k, rank + rankStep * k);
    if (!square || after.has(square)) return squares;
    squares.push(square);
  }
}

/**
 * The battery a rook or the queen on a file free of its pawns leaves for its
 * partner to make next move, from off the file.
 */
export function batteryReady(after: Board, to: Square): Reason | null {
  const mover = after.get(to);
  const role = mover && FILE_PARTNERS[mover.role];
  const [file] = squareCoords(to);
  if (!mover || !role || pawnsOn(after, file, mover.color).length > 0) return null;
  const run = new Set(FILE_STEPS.flatMap(step => emptyRun(after, to, step)));
  for (const [square, piece] of after) {
    if (piece.color !== mover.color || piece.role !== role || squareCoords(square)[0] === file)
      continue;
    if (attackedSquares(after, square).some(reach => run.has(reach))) {
      const halfOpen = pawnsOn(after, file, opposite(mover.color)).length > 0;
      return { kind: 'preparesBattery', partner: piece, halfOpen };
    }
  }
  return null;
}

/** A diagonal battery's line, from its back piece to the piece it's aimed at, ringed. */
export function batteryMarks(after: Board, to: Square): Mark[] | null {
  const aim = linedUp(after, to, null)?.aim;
  if (!aim) return null;
  return [
    { kind: 'link', from: aim.back, to: aim.target, tone: 'attack' },
    { kind: 'ring', square: aim.target, tone: 'attack' },
  ];
}
