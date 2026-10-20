import {
  attackedSquares,
  type Board,
  type Color,
  parseSquare,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark, MarkTone } from '#page/board/review-arrows.ts';
import { forkedSquares } from '#page/review/chess/fork.ts';
import { pinOf } from '#page/review/chess/rays.ts';
import { batteryMarks } from './battery.ts';
import { discoveryMarks } from './discovery.ts';
import { doubleThreatMarks } from './double-threat.ts';
import type { Reason } from './idea.ts';
import { oppositionMarks } from './opposition.ts';
import { pathOf, squareMarks } from './pawn-square.ts';
import { ownRank } from './structure.ts';
import { pinLine } from './tactic-marks.ts';

// What the coach draws on the board of what a move does (page/board/drawing.ts):
// the lines of a fork or a pin, a passed pawn's road, a rook's file, the square
// of the rule of the square. Read from the move's own boards, drawn on the
// board shown, which is the same but for the move when it's one not played.

/** A move, the reason it was played for, and the board the drawing goes on. */
export interface Scene {
  readonly uci: string;
  /** The boards before and after the move. */
  readonly before: Board;
  readonly after: Board;
  /** The board shown, and its side to move. */
  readonly shown: Board;
  readonly toMove: Color;
}

const ring = (square: Square, tone: MarkTone): Mark => ({ kind: 'ring', square, tone });
const link = (from: Square, to: Square, tone: MarkTone): Mark => ({ kind: 'link', from, to, tone });

const samePiece = (first: Piece | undefined, second: Piece): boolean =>
  first?.role === second.role && first.color === second.color;

/** The square of `piece` among those the piece on `from` attacks. */
const attackedOne = (board: Board, from: Square, piece: Piece): Square | undefined =>
  attackedSquares(board, from).find(square => samePiece(board.get(square), piece));

/** Each target's line from the piece on `from`, and the target ringed. */
const hits = (from: Square, targets: readonly Square[], tone: MarkTone): Mark[] => [
  ...targets.map(target => link(from, target, tone)),
  ...targets.map(target => ring(target, tone)),
];

function pinMarks(after: Board, pinner: Square): Mark[] | null {
  for (const square of after.keys()) {
    const pin = pinOf(after, square, true);
    if (pin?.pinner === pinner) return pinLine(pinner, square, pin.behind);
  }
  return null;
}

const fileOf = (square: Square): Square[] =>
  Array.from({ length: 8 }, (_, rank) => squareAt(squareCoords(square)[0], rank) ?? []).flat();

const rankOf = (square: Square): Square[] =>
  Array.from({ length: 8 }, (_, file) => squareAt(file, squareCoords(square)[1]) ?? []).flat();

/** A rook's file or rank, which lights up each way out from the rook. */
const runFrom = (rook: Square, line: readonly Square[]): Mark[] => [
  { kind: 'run', from: rook, squares: line.filter(square => square !== rook), tone: 'plan' },
];

/** A passed pawn's road to queening, from the pawn on `pawn`. */
function roadMarks(board: Board, pawn: Square): Mark[] {
  const color = board.get(pawn)?.color;
  return color ? [{ kind: 'run', from: pawn, squares: pathOf(pawn, color), tone: 'plan' }] : [];
}

// The rook's passed pawn: the first pawn of its own ahead of it on its file.
function behindMarks(after: Board, rook: Square): Mark[] {
  const color = after.get(rook)?.color;
  if (!color) return [];
  const pawn = fileOf(rook)
    .filter(square => ownRank(square, color) > ownRank(rook, color))
    .toSorted((first, second) => ownRank(first, color) - ownRank(second, color))
    .find(square => samePiece(after.get(square), { role: 'pawn', color }));
  return pawn ? [link(rook, pawn, 'defense'), ...roadMarks(after, pawn)] : [];
}

function outpostMarks(after: Board, knight: Square): Mark[] {
  const color = after.get(knight)?.color;
  if (!color) return [];
  const holder = holderOf(after, knight, color);
  return [ring(knight, 'defense'), ...(holder ? [link(holder, knight, 'defense')] : [])];
}

// The pawn of its own that holds the knight's square.
function holderOf(board: Board, square: Square, color: Color): Square | null {
  const [file, rank] = squareCoords(square);
  const back = color === 'white' ? -1 : 1;
  const holders = [file - 1, file + 1].flatMap(side => squareAt(side, rank + back) ?? []);
  return holders.find(holder => samePiece(board.get(holder), { role: 'pawn', color })) ?? null;
}

// The marks of a reason that's about the piece moved, from its square after the move.
function pieceMarks(reason: Reason, { after, shown }: Scene, to: Square): Mark[] | null {
  if (reason.kind === 'fork') return hits(to, forkedSquares(after, to), 'attack');
  if (reason.kind === 'doubleThreat') return doubleThreatMarks(after, to, reason.target);
  if (reason.kind === 'pins') return pinMarks(after, to);
  if (reason.kind === 'chases' || reason.kind === 'guards') {
    const target = attackedOne(after, to, reason.piece);
    if (!target) return null;
    // A line to the piece defended would read as the move going on there: its ring alone.
    return reason.kind === 'chases' ? hits(to, [target], 'attack') : [ring(target, 'defense')];
  }
  if (reason.kind === 'attacksPawn') return hits(to, [reason.square], 'attack');
  if (reason.kind === 'saves') return [ring(to, 'defense')];
  if (reason.kind === 'discovery') return discoveryMarks(after, to, shown);
  if (reason.kind === 'outpost') return outpostMarks(after, to);
  if (reason.kind === 'diagonalBattery') return batteryMarks(after, to);
  return null;
}

/**
 * The line of a move not played, under the rest of a drawing that starts where
 * it lands: an arrow shows it only after an error.
 */
export function withMove(
  uci: string,
  tone: MarkTone,
  marks: readonly Mark[] | null,
): Mark[] | null {
  const from = parseSquare(uci.slice(0, 2));
  const to = parseSquare(uci.slice(2, 4));
  if (!marks || marks.length === 0 || !from || !to) return null;
  return [link(from, to, tone), ...marks];
}

// The reasons drawn as the file of the rook, or the queen, moved.
const ON_FILE: ReadonlySet<Reason['kind']> = new Set<Reason['kind']>([
  'openFile',
  'doublesRooks',
  'fileBattery',
  'preparesBattery',
]);

/** What the coach draws of the reason a move was, or would have been, played for. */
export function reasonMarks(reason: Reason | null, scene: Scene): Mark[] | null {
  const from = parseSquare(scene.uci.slice(0, 2));
  const to = parseSquare(scene.uci.slice(2, 4));
  if (!reason || !from || !to) return null;
  if (reason.kind === 'both') {
    const marks = [reason.first, reason.second].flatMap(plan => reasonMarks(plan, scene) ?? []);
    return marks.length > 0 ? marks : null;
  }
  if (reason.kind === 'outruns' || reason.kind === 'entersSquare')
    return squareMarks(reason, scene.shown, scene.toMove);
  if (reason.kind === 'opposition') return oppositionMarks(scene.after);
  if (reason.kind === 'passedPawn') return roadMarks(scene.after, to);
  if (reason.kind === 'behindPasser') return behindMarks(scene.after, to);
  if (ON_FILE.has(reason.kind)) return runFrom(to, fileOf(to));
  if (reason.kind === 'seventhRank') return runFrom(to, rankOf(to));
  if (reason.kind === 'luft') return [{ kind: 'cells', squares: [from], tone: 'defense' }];
  return pieceMarks(reason, scene, to);
}
