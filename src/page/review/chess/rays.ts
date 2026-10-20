import {
  attackedSquares,
  type Board,
  type Color,
  opposite,
  type Piece,
  PIECE_VALUES,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { boardAfter } from './line.ts';
import { attackerValues } from './material.ts';

// The board's lines, as the motifs read them: what stands between two
// squares, what pins a piece, what a pin keeps from taking, and what defends one.

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** The squares strictly between two on a line, none when they share no line. */
export function between(from: Square, to: Square): Square[] {
  const [fromFile, fromRank] = squareCoords(from);
  const [toFile, toRank] = squareCoords(to);
  const fileGap = toFile - fromFile;
  const rankGap = toRank - fromRank;
  const aligned = fileGap === 0 || rankGap === 0 || Math.abs(fileGap) === Math.abs(rankGap);
  if (!aligned) return [];
  const length = Math.max(Math.abs(fileGap), Math.abs(rankGap));
  const squares: Square[] = [];
  for (let k = 1; k < length; k++) {
    const square = squareAt(fromFile + (k * fileGap) / length, fromRank + (k * rankGap) / length);
    if (square) squares.push(square);
  }
  return squares;
}

/** The first piece from `from`, the square itself left out, one step at a time. */
export function firstPiece(
  board: Board,
  from: Square,
  [fileStep, rankStep]: readonly [number, number],
): { square: Square; piece: Piece } | null {
  const [file, rank] = squareCoords(from);
  for (let k = 1; ; k++) {
    const square = squareAt(file + fileStep * k, rank + rankStep * k);
    if (!square) return null;
    const piece = board.get(square);
    if (piece) return { square, piece };
  }
}

const slidesAlong = (piece: Piece, [fileStep, rankStep]: readonly [number, number]): boolean =>
  piece.role === 'queen' || piece.role === (fileStep === 0 || rankStep === 0 ? 'rook' : 'bishop');

export interface Pin {
  readonly pinner: Square;
  /** The king, or the piece worth more, the pinned piece shields. */
  readonly behind: Square;
}

/**
 * What pins the piece on `square`: a slider of the other side on a line
 * through it, with its own king behind, or a piece worth more when `relative`.
 */
export function pinOf(board: Board, square: Square, relative = false): Pin | null {
  const piece = board.get(square);
  if (!piece || piece.role === 'king') return null;
  for (const direction of DIRECTIONS) {
    const ahead = firstPiece(board, square, direction);
    if (ahead?.piece.color !== opposite(piece.color) || !slidesAlong(ahead.piece, direction))
      continue;
    const behind = firstPiece(board, square, [-direction[0], -direction[1]]);
    if (behind?.piece.color !== piece.color) continue;
    const shields =
      behind.piece.role === 'king' ||
      (relative && PIECE_VALUES[behind.piece.role] > PIECE_VALUES[piece.role]);
    if (shields) return { pinner: ahead.square, behind: behind.square };
  }
  return null;
}

export interface PinnedTaker extends Pin {
  /** The pinned piece, the only one that could take. */
  readonly taker: Square;
}

/** Whether the piece on `taker` takes on `at` off the line its pin holds it on. */
const offLine = (at: Square, pin: Pin): boolean =>
  at !== pin.pinner && !between(pin.pinner, pin.behind).includes(at);

/**
 * The only piece of `side`'s that can take on `at`, when it's pinned off that
 * line to a piece worth more than it would take, counting the pinner taken
 * in turn: taking would give up what stood behind it.
 */
export function pinnedTaker(board: Board, at: Square, side: Color): PinnedTaker | null {
  const [taker, ...others] = attackersOn(board, at, side);
  const pin = taker && others.length === 0 ? pinOf(board, taker, true) : null;
  if (!taker || !pin || !offLine(at, pin)) return null;
  const [target, pinner, behind] = [at, pin.pinner, pin.behind].map(square => board.get(square));
  if (!target || !pinner || !behind || behind.role === 'king') return null;
  const taken = boardAfter(board, `${taker}${at}`);
  const back = isDefended(taken, pin.behind, side) ? PIECE_VALUES[pinner.role] : 0;
  return PIECE_VALUES[target.role] + back > PIECE_VALUES[behind.role] ? null : { taker, ...pin };
}

/** The squares of `by`'s pieces that attack `target`, pins ignored. */
export const attackersOn = (board: Board, target: Square, by: Color): Square[] =>
  [...board].flatMap(([square, piece]) =>
    piece.color === by && attackedSquares(board, square).includes(target) ? [square] : [],
  );

/** Whether `color` defends `square`, counting a defender behind one of the attackers. */
export function isDefended(board: Board, square: Square, color: Color): boolean {
  if (attackersOn(board, square, color).length > 0) return true;
  return attackersOn(board, square, opposite(color)).some(attacker => {
    const without = new Map(board);
    without.delete(attacker);
    return attackersOn(without, square, color).length > 0;
  });
}

/** A piece the other side can take for free, or with something cheaper. */
export function isInBadSpot(board: Board, square: Square): boolean {
  const piece = board.get(square);
  if (!piece) return false;
  const hits = attackerValues(board, square, opposite(piece.color));
  if (hits.length === 0) return false;
  return Math.min(...hits) < PIECE_VALUES[piece.role] || !isDefended(board, square, piece.color);
}

/** The squares of `color`'s king's attackers. */
export function checkers(board: Board, color: Color): Square[] {
  const king = [...board].find(([, piece]) => piece.role === 'king' && piece.color === color);
  return king ? attackersOn(board, king[0], opposite(color)) : [];
}

export interface Battery {
  /** The piece of its own the slider stands behind. */
  readonly screen: Square;
  readonly target: Square;
}

/**
 * The line from the slider on `square` through a piece of its own to the
 * other side's king, or queen, which that piece's move would open.
 */
export function batteryOf(board: Board, square: Square): Battery | null {
  const piece = board.get(square);
  if (!piece || piece.role === 'pawn' || piece.role === 'knight' || piece.role === 'king')
    return null;
  for (const direction of DIRECTIONS) {
    if (!slidesAlong(piece, direction)) continue;
    const screen = firstPiece(board, square, direction);
    // A pawn mostly can't step off the line: only a capture takes it off a file.
    if (screen?.piece.color !== piece.color || screen.piece.role === 'pawn') continue;
    const target = firstPiece(board, screen.square, direction);
    if (target?.piece.color !== opposite(piece.color)) continue;
    const { role } = target.piece;
    if (role === 'king' || (role === 'queen' && piece.role !== 'queen'))
      return { screen: screen.square, target: target.square };
  }
  return null;
}
