import { roleOfLetter } from '#shared/chess/pieces.ts';
import { parseSquare, squareCoords } from '#shared/chess/squares.ts';
import type { Board, Role, Square } from '#shared/chess/types.ts';
import { isPromotion, readHighlight } from './choose.ts';

// How a move's piece went, for the sound of its gesture (choose.ts,
// gestureSound): slid along a line, two squares or more (a bishop, rook or
// queen, or a pawn's double step), or jumped (a knight). A king steps: it's
// set down, as is a piece that went one square. A pawn may also promote.

const SLIDERS: ReadonlySet<Role> = new Set(['bishop', 'rook', 'queen']);
const MIN_REACH = 2;

export interface Gesture {
  /** How many squares the piece slid; null if it didn't. */
  readonly reach: number | null;
  readonly jumped: boolean;
  readonly promoted: boolean;
}

/** How many squares the piece slid from `from` to `to`, or null for a move that isn't a slide. */
export function slideReach(role: Role, from: Square, to: Square): number | null {
  const [fromFile, fromRank] = squareCoords(from);
  const [toFile, toRank] = squareCoords(to);
  const reach = Math.max(Math.abs(fromFile - toFile), Math.abs(fromRank - toRank));
  if (reach < MIN_REACH) return null;
  return SLIDERS.has(role) || role === 'pawn' ? reach : null;
}

interface Move {
  readonly role: Role;
  readonly from: Square | null;
  readonly to: Square | null;
  readonly promoted: boolean;
}

const gestureOf = ({ role, from, to, promoted }: Move): Gesture => ({
  reach: from && to ? slideReach(role, from, to) : null,
  jumped: role === 'knight',
  promoted,
});

/** The gesture of a move given by its SAN and UCI; null for castling, whose SAN names no piece, and drops. */
export function gestureOfSan(san: string, uci: string | undefined): Gesture | null {
  // A drop (N@f3) comes from the pocket: it's set down, not slid nor jumped.
  if (san.includes('@')) return null;
  const role = /^[a-h]/.test(san) ? 'pawn' : roleOfLetter(san[0] ?? '');
  if (!role) return null;
  const from = parseSquare(uci?.slice(0, 2) ?? '');
  const to = parseSquare(uci?.slice(2, 4) ?? '');
  return gestureOf({ role, from, to, promoted: san.includes('=') });
}

/**
 * The gesture of the move the board highlights, its piece on the square it
 * reached; `before`, the pieces before it, tells a promotion.
 */
export function gestureOnBoard(
  pieces: Board,
  lastMove: readonly Square[],
  before: Board | null,
): Gesture | null {
  const [first, second] = lastMove;
  if (first === undefined || second === undefined) return null;
  const highlight = readHighlight(pieces, first, second);
  const { orig, dest, mover } = highlight;
  if (!dest || !mover) return null;
  return gestureOf({
    role: mover.role,
    from: orig,
    to: dest,
    promoted: isPromotion(highlight, before),
  });
}
