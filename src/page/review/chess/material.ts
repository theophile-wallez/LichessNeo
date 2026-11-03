import {
  attackedSquares,
  attackers,
  opposite,
  parseFen,
  parseSquare,
  PIECE_VALUES,
} from '#shared/chess/index.ts';
import type { Board, Color, Piece, Role, Square } from '#shared/chess/index.ts';

// The review's facts still import the values from here.
export { PIECE_VALUES } from '#shared/chess/index.ts';

// As an attacker the king is worth the most: it can only take what's undefended.
const ATTACKER_VALUES: Readonly<Record<Role, number>> = { ...PIECE_VALUES, king: 100 };

/** The values of `by`'s pieces attacking `target`, pins ignored. */
export const attackerValues = (board: Board, target: Square, by: Color): number[] =>
  attackers(board, target, by).map(role => ATTACKER_VALUES[role]);

/** The squares of `by`'s pieces attacking `target`, the cheapest first, pins ignored. */
export const attackerSquares = (board: Board, target: Square, by: Color): Square[] =>
  [...board]
    .filter(([from, piece]) => piece.color === by && attackedSquares(board, from).includes(target))
    .toSorted(([, first], [, second]) => ATTACKER_VALUES[first.role] - ATTACKER_VALUES[second.role])
    .map(([from]) => from);

/**
 * What `side` wins by taking on `square`, then trading on there cheapest piece
 * first, either side free to stop: 0 when taking loses. Pins ignored.
 */
export function exchangeGain(board: Board, square: Square, side: Color): number {
  const target = board.get(square);
  const [from] = attackerSquares(board, square, side);
  const taker = from && board.get(from);
  if (!target || !from || !taker) return 0;
  const next = new Map(board);
  next.delete(from);
  next.set(square, taker);
  // A king takes only what nothing defends.
  if (taker.role === 'king' && attackers(next, square, opposite(side)).length > 0) return 0;
  return Math.max(0, PIECE_VALUES[target.role] - exchangeGain(next, square, opposite(side)));
}

/** The piece on a square named in text ("e4"), if any. */
export function pieceOn(board: Board, name: string): Piece | undefined {
  const square = parseSquare(name);
  return square ? board.get(square) : undefined;
}

/**
 * A piece left to be won: attacked, and either undefended or attacked by
 * something cheaper.
 */
export function isHanging(board: Board, square: Square, piece: Piece): boolean {
  const hits = attackerValues(board, square, opposite(piece.color));
  if (hits.length === 0) return false;
  return (
    Math.min(...hits) < PIECE_VALUES[piece.role] ||
    attackers(board, square, piece.color).length === 0
  );
}

/**
 * A sound piece sacrifice: the moved piece can be taken by something cheaper,
 * or for free, and it wasn't just a trade.
 */
export function isSacrifice(fenBefore: string, fenAfter: string, uci: string): boolean {
  const before = parseFen(fenBefore).board;
  const after = parseFen(fenAfter).board;
  const dest = parseSquare(uci.slice(2, 4));
  const piece = dest ? after.get(dest) : undefined;
  if (!dest || !piece || piece.role === 'pawn' || piece.role === 'king') return false;
  const value = PIECE_VALUES[piece.role];
  const taken = before.get(dest);
  const captured = taken ? PIECE_VALUES[taken.role] : 0;
  if (captured >= value) return false;
  return isHanging(after, dest, piece);
}
