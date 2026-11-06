import { parseSquare, type Piece, type Square } from '#shared/chess/index.ts';
import { isHanging } from './material.ts';
import type { Ply } from './played-line.ts';
import { attackersOn, between, isInBadSpot } from './rays.ts';

// A line cut, or a line cleared. An interference: a piece steps between a
// defender and what it defends, which falls two plies on. A clearance: a piece
// steps off a square or a line with tempo, or given up, for a slider to come
// through, or a pawn to promote there.

export interface Interference {
  readonly defender: Piece;
  readonly target: Piece;
  /** Where the defender stands, where the target does, and where the move steps in between. */
  readonly from: Square;
  readonly at: Square;
  readonly into: Square;
}

const SLIDERS = new Set(['bishop', 'rook', 'queen']);

const squaresOf = (ply: Ply | undefined): [Square | null, Square | null] => [
  parseSquare(ply?.uci.slice(0, 2) ?? ''),
  parseSquare(ply?.uci.slice(2, 4) ?? ''),
];

/** The interference ply `i` of `plies` makes, if any. */
export function interferenceAt(plies: readonly Ply[], i: number): Interference | null {
  const [cuts, reply, takes] = [plies[i], plies[i + 1], plies[i + 2]];
  const [, into] = squaresOf(cuts);
  const [, at] = squaresOf(takes);
  const target = takes?.captured;
  if (!cuts || !into || !at || !target || reply?.uci.slice(2, 4) === at) return null;
  if (!isHanging(takes.before, at, target)) return null;
  for (const from of attackersOn(cuts.before, at, target.color)) {
    const defender = cuts.before.get(from);
    if (defender && SLIDERS.has(defender.role) && between(at, from).includes(into))
      return { defender, target, from, at, into };
  }
  return null;
}

// The piece a move puts on its square: a slider, or a pawn promoted to one.
function arriving(ply: Ply): Piece | undefined {
  const to = parseSquare(ply.uci.slice(2, 4));
  return to ? ply.after.get(to) : undefined;
}

// A slider's quiet move after a reply that doesn't check, nor steps the king out of a check.
function slides(reply: Ply, through: Ply): boolean {
  const kingOut = through.check && reply.piece.role === 'king';
  const role = arriving(through)?.role;
  return !!role && SLIDERS.has(role) && !through.captured && !reply.check && !kingOut;
}

export interface Clearing {
  /** Where the piece that clears stood, and where it went. */
  readonly left: Square;
  readonly went: Square;
  /** Where the slider comes from, and where it goes. */
  readonly from: Square;
  readonly to: Square;
}

function clearingOf(clears: Ply, through: Ply): Clearing | null {
  const [left, went] = squaresOf(clears);
  const [from, to] = squaresOf(through);
  if (!left || !went || !from || !to || went === from || went === to) return null;
  return { left, went, from, to };
}

/** The way ply `i` of `plies` clears, two plies on, and the slider that comes through, if any. */
export function clearingAt(
  plies: readonly Ply[],
  i: number,
): (Clearing & { readonly slider: Piece }) | null {
  const [clears, reply, through] = [plies[i], plies[i + 1], plies[i + 2]];
  if (!clears || !reply || !through || clears.promotion || !slides(reply, through)) return null;
  const clearing = clearingOf(clears, through);
  const slider = arriving(through);
  if (!clearing || !slider) return null;
  const { left, went, from, to } = clearing;
  const opened = left === to || between(from, to).includes(left);
  // With tempo, a check or a capture, or given up: not a piece merely stepping aside.
  const forcing = clears.check || clears.captured !== null || isInBadSpot(clears.after, went);
  return opened && forcing ? { ...clearing, slider } : null;
}

/** The slider that ply `i` of `plies` clears the way for, two plies on, if any. */
export const clearanceAt = (plies: readonly Ply[], i: number): Piece | null =>
  clearingAt(plies, i)?.slider ?? null;
