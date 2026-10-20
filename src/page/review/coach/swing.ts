import { type Board, type Color, type Piece, PIECE_VALUES } from '#shared/chess/index.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import type { Ply } from '#page/review/chess/played-line.ts';
import { whichOne } from './which-one.ts';

// What a line does to the material: the pieces each side takes until the
// trades are over, as the coach puts it ("wins a knight for a pawn").

export interface Swing {
  /** The other side's pieces the side takes, the most valuable first, trades left out. */
  readonly won: readonly Piece[];
  /** The side's own pieces taken. */
  readonly lost: readonly Piece[];
  /** What the side comes out ahead, in pawns. */
  readonly net: number;
  /** The plies it takes. */
  readonly plies: number;
  /** The one piece won's square, as a token, when its side had more than one like it. */
  readonly square: string | null;
}

const worth = (piece: Piece): number => PIECE_VALUES[piece.role];
const byWorth = (first: Piece, second: Piece): number => worth(second) - worth(first);

/**
 * Where the line settles: after each ply the next one takes nothing on, the
 * trades over. The line's last ply never is one, what comes after it unknown.
 */
function settledPoints(plies: readonly Ply[]): number[] {
  const points = [0];
  for (let k = 1; k < plies.length; k++) if (plies[k]?.captured === null) points.push(k);
  return points;
}

/** What `side` comes out ahead after `count` plies, in pawns, promotions counted. */
function netAfter(plies: readonly Ply[], count: number, side: Color): number {
  let net = 0;
  for (const { color, captured, promotion } of plies.slice(0, count)) {
    const sign = color === side ? 1 : -1;
    if (captured) net += sign * worth(captured);
    if (promotion) net += sign * (PIECE_VALUES[promotion] - PIECE_VALUES.pawn);
  }
  return net;
}

/** What `side` comes out ahead where the line last settles. */
export const finalNet = (plies: readonly Ply[], side: Color): number =>
  netAfter(plies, settledPoints(plies).at(-1) ?? 0, side);

/** Drops the pieces traded for one of the same worth: a knight for a bishop wins nothing. */
function withoutTrades(won: readonly Piece[], lost: readonly Piece[]): [Piece[], Piece[]] {
  const left = [...lost];
  const kept = won.filter(piece => {
    const traded = left.findIndex(other => worth(other) === worth(piece));
    if (traded < 0) return true;
    left.splice(traded, 1);
    return false;
  });
  return [kept.toSorted(byWorth), left.toSorted(byWorth)];
}

// Where the one piece won was taken, said as "the c6 pawn": not when the line
// takes more than one like it, nor en passant, the pawn not on the square taken.
function wonOn(taken: readonly Ply[], won: readonly Piece[], side: Color): string | null {
  const [piece] = won;
  if (!piece || won.length > 1) return null;
  const takes = taken.filter(ply => ply.color === side && ply.captured?.role === piece.role);
  const [take] = takes;
  const square = take?.uci.slice(2, 4) ?? '';
  if (!take || takes.length > 1 || !pieceOn(take.before, square)) return null;
  return whichOne(take.before, square, piece);
}

function swingAfter(plies: readonly Ply[], count: number, side: Color): Swing {
  const taken = plies.slice(0, count).filter(ply => ply.captured !== null);
  const [won, lost] = withoutTrades(
    taken.flatMap(ply => (ply.color === side && ply.captured ? [ply.captured] : [])),
    taken.flatMap(ply => (ply.color !== side && ply.captured ? [ply.captured] : [])),
  );
  const square = wonOn(taken, won, side);
  return { won, lost, net: netAfter(plies, count, side), plies: count, square };
}

/**
 * The material `side` wins along `plies` and keeps: the first point the line
 * settles a pawn or more up, with no later one lower. Null for none, and for
 * a line with a promotion, which counts are no way to tell.
 */
export function securedSwing(plies: readonly Ply[], side: Color): Swing | null {
  const points = settledPoints(plies);
  const nets = points.map(count => netAfter(plies, count, side));
  const first = nets.findIndex((net, i) => net >= 1 && nets.slice(i).every(later => later >= net));
  const count = points[first];
  if (count === undefined || plies.slice(0, count).some(ply => ply.promotion)) return null;
  return swingAfter(plies, count, side);
}

/**
 * Whether `color` gives material away in plies `from` to `to`: a piece left
 * where the next ply takes it, for less than it's worth. What the other side
 * wins then is that side's choice, for something the counts don't show.
 */
export function gives(plies: readonly Ply[], color: Color, [from, to]: [number, number]): boolean {
  return plies.slice(from, to).some((ply, i) => {
    const next = plies[from + i + 1];
    if (ply.color !== color || ply.piece.role === 'king' || !next?.captured) return false;
    const taken = ply.captured ? worth(ply.captured) : 0;
    return next.uci.slice(2, 4) === ply.uci.slice(2, 4) && worth(ply.piece) > taken;
  });
}

/** Whether a swing is a win worth stating: a trade of unlike pieces must gain more than a pawn. */
export const worthSaying = ({ net, lost }: Swing): boolean => net >= (lost.length > 0 ? 2 : 1);

/** `side`'s material less the other's, in pawns. */
export function materialBalance(board: Board, side: Color): number {
  let balance = 0;
  for (const piece of board.values()) balance += (piece.color === side ? 1 : -1) * worth(piece);
  return balance;
}

export interface PieceCount {
  readonly piece: Piece;
  readonly count: number;
}

/** Pieces counted by kind, in their order: two pawns and a knight. */
export function countPieces(pieces: readonly Piece[]): PieceCount[] {
  const counts: PieceCount[] = [];
  for (const piece of pieces) {
    const known = counts.findIndex(({ piece: other }) => other.role === piece.role);
    const count = counts[known];
    if (count) counts[known] = { piece, count: count.count + 1 };
    else counts.push({ piece, count: 1 });
  }
  return counts;
}
