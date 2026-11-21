import {
  attackedSquares,
  attackers,
  isInCheck,
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

/** Whether `piece` on `from` can take on `target` without leaving its own king in check. */
function canTake(board: Board, from: Square, piece: Piece, target: Square): boolean {
  if (!attackedSquares(board, from).includes(target)) return false;
  const next = new Map(board);
  next.delete(from);
  next.set(target, piece);
  return !isInCheck(next, piece.color);
}

/**
 * The squares of `by`'s pieces that can take on `target`, the cheapest first:
 * not a piece pinned to its king off that line, nor a king onto a defended square.
 */
export const attackerSquares = (board: Board, target: Square, by: Color): Square[] =>
  [...board]
    .filter(([from, piece]) => piece.color === by && canTake(board, from, piece, target))
    .toSorted(([, first], [, second]) => ATTACKER_VALUES[first.role] - ATTACKER_VALUES[second.role])
    .map(([from]) => from);

/** The values of `by`'s pieces that can take on `target`, the cheapest first. */
export const attackerValues = (board: Board, target: Square, by: Color): number[] =>
  attackerSquares(board, target, by).flatMap(from => {
    const piece = board.get(from);
    return piece ? [ATTACKER_VALUES[piece.role]] : [];
  });

/**
 * What `side` wins by taking on `square`, then trading on there cheapest piece
 * first, either side free to stop: 0 when taking loses.
 */
export function exchangeGain(board: Board, square: Square, side: Color): number {
  const target = board.get(square);
  const [from] = attackerSquares(board, square, side);
  const taker = from && board.get(from);
  if (!target || !from || !taker) return 0;
  const next = new Map(board);
  next.delete(from);
  next.set(square, taker);
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
