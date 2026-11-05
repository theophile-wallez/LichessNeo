import {
  attackers,
  type Board,
  type Color,
  opposite,
  parseSquare,
  type Piece,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Plan } from './idea.ts';

// A fianchetto, and what its bishop meets down the long diagonal: a piece to
// aim at, a central enemy pawn held by another, which a pawn of ours may come
// to challenge (or not: granite), or its own pawn in front.

/** A fianchetto's squares: the bishop's, then its pawn's, one square up the knight's file. */
export const FIANCHETTOS: Readonly<Record<string, string>> = {
  b2: 'b3',
  g2: 'g3',
  b7: 'b6',
  g7: 'g6',
};

// Where a king castled behind each fianchetto bishop stands.
const KING_SQUARES: Readonly<Record<string, readonly string[]>> = {
  b2: ['a1', 'b1', 'c1'],
  g2: ['g1', 'h1'],
  b7: ['a8', 'b8', 'c8'],
  g7: ['g8', 'h8'],
};

/** The squares beside a fianchetto's pawn, which its bishop guards. */
export function holesBeside(pawn: Square): readonly [Square, Square] | null {
  const [file, rank] = squareCoords(pawn);
  const left = squareAt(file - 1, rank);
  const right = squareAt(file + 1, rank);
  return left && right ? [left, right] : null;
}

/** The holes a castled king would keep if `color`'s fianchetto bishop on `square` left. */
export function guardedHoles(
  board: Board,
  square: Square,
  color: Color,
): readonly [Square, Square] | null {
  const pawn = parseSquare(FIANCHETTOS[square] ?? '');
  const king = [...board].find(([, piece]) => piece.role === 'king' && piece.color === color)?.[0];
  const piece = board.get(square);
  if (!pawn || !king || piece?.role !== 'bishop' || piece.color !== color) return null;
  const guarded = board.get(pawn)?.role === 'pawn' && board.get(pawn)?.color === color;
  return guarded && KING_SQUARES[square]?.includes(king) ? holesBeside(pawn) : null;
}

/** What the bishop meets down the long diagonal. */
export type Aim =
  | { readonly kind: 'target'; readonly square: Square; readonly target: Piece }
  /** A held pawn, and the square a pawn of ours can push to in one move to hit it. */
  | { readonly kind: 'held'; readonly square: Square; readonly lever: Square | null }
  | { readonly kind: 'behind'; readonly square: Square };

// Its own pawn this close shuts the diagonal (e4 for a bishop on g2); farther
// up (d5), the bishop backs it.
const BEHIND_REACH = 2;

function diagonalOf(square: Square): Square[] {
  const [file, rank] = squareCoords(square);
  const fileStep = file < 4 ? 1 : -1;
  const rankStep = rank < 4 ? 1 : -1;
  const squares: Square[] = [];
  for (let i = 1; i < 8; i++) {
    const next = squareAt(file + fileStep * i, rank + rankStep * i);
    if (!next) break;
    squares.push(next);
  }
  return squares;
}

const heldByPawn = (board: Board, square: Square, color: Color): boolean =>
  attackers(board, square, color).includes('pawn');

// An enemy piece the bishop hits: not the king (a check, said elsewhere), nor
// a pawn its pawns hold, nor one at home that something guards (g2 behind its bishop).
function targetOn(board: Board, square: Square, them: Color): Piece | null {
  const piece = board.get(square);
  if (piece?.color !== them || piece.role === 'king') return null;
  if (piece.role !== 'pawn') return piece;
  const home = squareCoords(square)[1] === (them === 'white' ? 1 : 6);
  if (home) return attackers(board, square, them).length === 0 ? piece : null;
  return heldByPawn(board, square, them) ? null : piece;
}

// The pawns held in the center are the ones that wall a bishop in.
const CENTER_FILES: ReadonlySet<number> = new Set([3, 4]);

/** A square one push of a pawn of `color` reaches, from where it attacks `square`. */
function leverOf(board: Board, square: Square, color: Color): Square | null {
  const [file, rank] = squareCoords(square);
  const step = color === 'white' ? 1 : -1;
  const start = color === 'white' ? 1 : 6;
  const own = (at: Square | null): boolean =>
    at !== null && board.get(at)?.role === 'pawn' && board.get(at)?.color === color;
  for (const side of [-1, 1]) {
    const lever = squareAt(file + side, rank - step);
    const one = squareAt(file + side, rank - 2 * step);
    const two = squareAt(file + side, rank - 3 * step);
    if (!lever || board.has(lever) || !one) continue;
    if (own(one)) return lever;
    if (!board.has(one) && own(two) && rank - 3 * step === start) return lever;
  }
  return null;
}

function aimOf(board: Board, square: Square, color: Color): Aim | null {
  const them = opposite(color);
  const diagonal = diagonalOf(square);
  const first = diagonal.find(at => board.has(at));
  const target = first && targetOn(board, first, them);
  if (first && target) return { kind: 'target', square: first, target };
  const index = diagonal.findIndex(at => board.get(at)?.role === 'pawn');
  const pawn = diagonal[index];
  if (!pawn) return null;
  if (board.get(pawn)?.color === color)
    return index < BEHIND_REACH ? { kind: 'behind', square: pawn } : null;
  if (!CENTER_FILES.has(squareCoords(pawn)[0]) || !heldByPawn(board, pawn, them)) return null;
  return { kind: 'held', square: pawn, lever: leverOf(board, pawn, color) };
}

/** A bishop that comes to a fianchetto square, its pawn in front of it. */
export function fianchettoOf(after: Board, to: Square, color: Color): Plan | null {
  const piece = after.get(to);
  const pawn = after.get(parseSquare(FIANCHETTOS[to] ?? '') ?? to);
  if (piece?.role !== 'bishop' || pawn?.role !== 'pawn' || pawn.color !== color) return null;
  return { kind: 'fianchetto', piece, aim: aimOf(after, to, color) };
}
