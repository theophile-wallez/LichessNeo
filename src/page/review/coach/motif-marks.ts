import { attackedSquares, opposite, parseSquare, type Square } from '#shared/chess/index.ts';
import type { Mark, MarkTone } from '#shared/board/marks.ts';
import { attractionAt } from '#page/review/chess/attraction.ts';
import { clearingAt, interferenceAt } from '#page/review/chess/interference.ts';
import type { Motif, MotifKind } from '#page/review/chess/motifs.ts';
import type { Ply } from '#page/review/chess/played-line.ts';
import { between, pinOf } from '#page/review/chess/rays.ts';
import { xrayAt } from '#page/review/chess/xray.ts';
import { checkMarks, pinLine, xrayLine } from './tactic-marks.ts';

// What the coach draws of a tactic, on the board after the move that makes
// it: the line it works along, the pieces it hits.

const ring = (square: Square, tone: MarkTone): Mark => ({ kind: 'ring', square, tone });
const link = (from: Square, to: Square, tone: MarkTone): Mark => ({ kind: 'link', from, to, tone });

const squaresOf = (ply: Ply | undefined): [Square | null, Square | null] => [
  parseSquare(ply?.uci.slice(0, 2) ?? ''),
  parseSquare(ply?.uci.slice(2, 4) ?? ''),
];

/** An x-ray: the slider's line through the piece it sees through. */
export function xrayMarks(plies: readonly Ply[], i: number): Mark[] | null {
  const found = xrayAt(plies, i);
  return found ? xrayLine(found) : null;
}

/** An attraction: the square the piece is lured to, and the move that strikes it there. */
export function attractionMarks(plies: readonly Ply[], i: number): Mark[] | null {
  const lure = attractionAt(plies, i);
  const [from, to] = squaresOf(plies[i + 2]);
  if (!lure || !from || !to) return null;
  return [link(from, to, 'plan'), link(to, lure.square, 'attack'), ring(lure.square, 'attack')];
}

/** A clearance: the line cleared, from the slider that comes through. */
export function clearanceMarks(plies: readonly Ply[], i: number): Mark[] | null {
  const clearing = clearingAt(plies, i);
  if (!clearing) return null;
  const { from, to } = clearing;
  return [{ kind: 'run', from, squares: [...between(from, to), to], tone: 'plan' }];
}

/** An interference: the defender's line cut, the piece stepped in, what it defended. */
function interferenceMarks(plies: readonly Ply[], i: number): Mark[] | null {
  const found = interferenceAt(plies, i);
  if (!found) return null;
  return [
    link(found.from, found.at, 'defense'),
    ring(found.into, 'plan'),
    ring(found.at, 'attack'),
  ];
}

type Drawn = (motif: Motif, plies: readonly Ply[]) => Mark[] | null;

// The squares of the move that makes the motif, the board after it, and where its pieces stand.
const sceneOf = ({ ply, at = [] }: Motif, plies: readonly Ply[]) => {
  const move = plies[ply];
  const [, to] = squaresOf(move);
  const [first, second] = at;
  return { move, to, first: first ?? null, second: second ?? null };
};

const hitsFrom: Drawn = (motif, plies) => {
  const { to } = sceneOf(motif, plies);
  const targets = (motif.at ?? []).flatMap(square => square ?? []);
  if (!to || targets.length === 0) return null;
  return [
    ...targets.map(square => link(to, square, 'attack')),
    ...targets.map(square => ring(square, 'attack')),
  ];
};

// The piece hit in front, the one behind taken: the line of the move through both.
const skewerMarks: Drawn = (motif, plies) => {
  const { to, first, second } = sceneOf(motif, plies);
  return to && first && second ? pinLine(to, first, second) : null;
};

const pinMarks: Drawn = (motif, plies) => {
  const { move, first } = sceneOf(motif, plies);
  const pin = move && first ? pinOf(move.after, first, true) : null;
  return pin && first ? pinLine(pin.pinner, first, pin.behind) : null;
};

// The piece attacked with nowhere to go: its squares barred.
const trappedMarks: Drawn = (motif, plies) => {
  const { move, first } = sceneOf(motif, plies);
  const piece = first ? move?.after.get(first) : undefined;
  if (!move || !first || !piece) return null;
  const flights = attackedSquares(move.after, first).filter(
    square => move.after.get(square)?.color !== piece.color,
  );
  return [
    ...flights.map((square): Mark => ({ kind: 'barred', square, tone: 'attack' })),
    ring(first, 'attack'),
  ];
};

// The slider uncovered, its line to the piece it takes next.
const discoveredMarks: Drawn = (motif, plies) => {
  const [from, to] = squaresOf(plies[motif.ply + 2]);
  return from && to ? [link(from, to, 'attack'), ring(to, 'attack')] : null;
};

const checkedMarks: Drawn = (motif, plies) => {
  const move = plies[motif.ply];
  return move ? checkMarks(move.after, opposite(move.color)) : null;
};

const ringed: Drawn = (motif, plies) => {
  const { first, second } = sceneOf(motif, plies);
  const square = second ?? first;
  return square ? [ring(square, 'attack')] : null;
};

const DRAWN: Partial<Record<MotifKind, Drawn>> = {
  fork: hitsFrom,
  doubleAttack: hitsFrom,
  pin: pinMarks,
  skewer: skewerMarks,
  discoveredAttack: discoveredMarks,
  discoveredCheck: checkedMarks,
  doubleCheck: checkedMarks,
  capturingDefender: ringed,
  hangingPiece: ringed,
  trappedPiece: trappedMarks,
  xray: ({ ply }, plies) => xrayMarks(plies, ply),
  attraction: ({ ply }, plies) => attractionMarks(plies, ply),
  interference: ({ ply }, plies) => interferenceMarks(plies, ply),
  clearance: ({ ply }, plies) => clearanceMarks(plies, ply),
};

/** What the coach draws of `motif`, found along `plies`, on the board after its move. */
export const motifMarks = (motif: Motif, plies: readonly Ply[]): Mark[] | null =>
  DRAWN[motif.kind]?.(motif, plies) ?? null;
