import { isAttacked } from '#shared/chess/attacks.ts';
import { parseSquare, squareCoords } from '#shared/chess/squares.ts';
import { COLORS, opposite } from '#shared/chess/types.ts';
import type { Board, Color, Piece, Role, Square } from '#shared/chess/types.ts';
import type { SoundName } from '#shared/sounds.ts';

// Which of our sounds a move gets, from its SAN or from the board after it.

const LICHESS_EVENTS: ReadonlyMap<string, SoundName> = new Map<string, SoundName>([
  ['move', 'move-self'],
  ['capture', 'capture'],
  ['genericNotify', 'game-start'],
  ['victory', 'game-end'],
  ['defeat', 'game-end'],
  ['draw', 'game-end'],
  ['lowTime', 'tenseconds'],
  ['error', 'illegal'],
  ['confirmation', 'notify'],
  ['newChallenge', 'notify'],
  ['newPM', 'notify'],
  ['socialNotify', 'notify'],
]);

/** Our sound for one of Lichess's named sounds, if we have one. */
export const soundForLichessEvent = (name: string): SoundName | undefined =>
  LICHESS_EVENTS.get(name);

export const fallbackSound = (lichessName: string | undefined): SoundName =>
  lichessName === 'capture' ? 'capture' : 'move-self';

export interface StandIn {
  readonly ours: SoundName;
  readonly lichess: string;
}

/**
 * What plays for a move whose sound the pack lacks: the pack's capture or
 * move, else Lichess's. A check's own sound, Lichess plays on its own.
 */
export const standIn = (captured: boolean): StandIn =>
  captured ? { ours: 'capture', lichess: 'capture' } : { ours: 'move-self', lichess: 'move' };

export function soundFromSan(san: string, ply: number | undefined, orientation: Color): SoundName {
  if (/[+#]/.test(san)) return 'move-check';
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('=')) return 'promote';
  if (san.includes('x')) return 'capture';
  if (ply === undefined) return 'move-self';
  const mover: Color = ply % 2 === 1 ? 'white' : 'black';
  return mover === orientation ? 'move-self' : 'move-opponent';
}

/**
 * The sound of the move on the board after a jump, or a plain move at the
 * start. A quiet move's SAN ends on its destination: the piece there says
 * whose move it was.
 */
export function soundOfShownMove(
  san: string | undefined,
  pieces: Board,
  orientation: Color,
): SoundName {
  const sound = san ? soundFromSan(san, undefined, orientation) : 'move-self';
  if (!san || sound !== 'move-self') return sound;
  const destination = parseSquare(san.slice(-2));
  const mover = destination && pieces.get(destination);
  return mover && mover.color !== orientation ? 'move-opponent' : 'move-self';
}

// After a legal move only the side to move can be in check, so any king
// under attack will do: no need for the last move's highlight, which is
// missing when "Highlight last move" is off.
const isAnyKingInCheck = (pieces: Board): boolean =>
  [...pieces].some(
    ([square, piece]) => piece.role === 'king' && isAttacked(pieces, square, opposite(piece.color)),
  );

// The roles of `color`'s pieces that left their square going from `from` to
// `to`, or null if one of them wasn't on its back rank.
function leavers(from: Board, to: Board, color: Color): Role[] | null {
  const backRank = color === 'white' ? '1' : '8';
  const roles: Role[] = [];
  for (const [square, piece] of from) {
    if (piece.color !== color) continue;
    const now = to.get(square);
    if (now?.color === color && now.role === piece.role) continue;
    if (square[1] !== backRank) return null;
    roles.push(piece.role);
  }
  return roles;
}

const isKingAndRook = (roles: readonly Role[] | null): boolean =>
  roles?.length === 2 && roles.includes('king') && roles.includes('rook');

/**
 * Whether one side castled: its king and a rook, and nothing else, moved
 * along its back rank. Read off the pieces rather than the highlight, which
 * may be off, and in Chess960 the king may move a single square.
 */
export function castled(before: Board | null, after: Board): boolean {
  if (!before) return false;
  return COLORS.some(
    color =>
      isKingAndRook(leavers(before, after, color)) && isKingAndRook(leavers(after, before, color)),
  );
}

export interface Highlight {
  readonly orig: Square;
  readonly dest: Square | null;
  readonly mover: Piece | undefined;
}

// The destination is the highlighted square with a piece on it. A drop
// highlights a single square.
export function readHighlight(pieces: Board, first: Square, second: Square): Highlight {
  let dest: Square | null = null;
  if (pieces.has(second)) dest = second;
  else if (pieces.has(first)) dest = first;
  const orig = dest === first ? second : first;
  return { orig, dest, mover: dest === null ? undefined : pieces.get(dest) };
}

// Lichess highlights castling as the king going to the g or c file, or onto
// its rook.
function isCastlingHighlight(first: Square, second: Square, mover: Piece | undefined): boolean {
  const [firstFile, firstRank] = squareCoords(first);
  const [secondFile, secondRank] = squareCoords(second);
  const sideways = firstRank === secondRank && Math.abs(firstFile - secondFile) >= 2;
  return sideways && (!mover || mover.role === 'king');
}

// Auto-queen swaps the pawn for a queen before we read the board, so look at
// what stood on the origin square before the move.
function isPromotion(highlight: Highlight, before: Board | null): boolean {
  const { orig, dest, mover } = highlight;
  const was = before?.get(orig);
  const wasPawn = mover?.role === 'pawn' || (was?.role === 'pawn' && was.color === mover?.color);
  return wasPawn && dest !== null && orig !== dest && /[18]$/.test(dest);
}

export interface BoardMove {
  /** The pieces before the move, if we saw them. */
  readonly before: Board | null;
  readonly pieces: Board;
  /** The highlighted squares, in the board's order. */
  readonly lastMove: readonly Square[];
  /** The sound Lichess asked for: `move`, `capture`, or none for a drop. */
  readonly lichessName: string | undefined;
  readonly orientation: Color;
}

export function soundFromBoard(move: BoardMove): SoundName {
  const { before, pieces, lastMove, lichessName, orientation } = move;
  if (isAnyKingInCheck(pieces)) return 'move-check';
  if (castled(before, pieces)) return 'castle';
  const first = lastMove[0];
  if (first === undefined) return fallbackSound(lichessName);
  const second = lastMove[1] ?? first;
  const highlight = readHighlight(pieces, first, second);
  const { mover } = highlight;
  if (isCastlingHighlight(first, second, mover)) return 'castle';
  if (isPromotion(highlight, before)) return 'promote';
  if (lichessName === 'capture') return 'capture';
  return !mover || mover.color === orientation ? 'move-self' : 'move-opponent';
}
