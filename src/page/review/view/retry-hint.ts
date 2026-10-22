import { isSquare, parseFen, type Piece, type Square } from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';

// The hints a retry gives, one at a time: first which piece has to move, then
// the square it stands on, marked on the board. The answer itself stays behind
// its own button.

/** The hints there are to ask for; past the last one, nothing is left to give. */
export const HINTS = 2;

export interface RetryHint {
  /** The piece that has to move, named from the first hint on. */
  readonly piece: Piece;
  /** Its square, from the second hint on, drawn on the board as well. */
  readonly square: Square | null;
  readonly marks: readonly Mark[];
}

/**
 * What `hints` hints give away of `best`, played from `fen`: null when none has
 * been asked for, or when the move's piece can't be read off the board.
 */
export function retryHint(fen: string, best: string | null, hints: number): RetryHint | null {
  if (!best || hints <= 0) return null;
  const from = best.slice(0, 2);
  if (!isSquare(from)) return null;
  const piece = parseFen(fen).board.get(from);
  if (!piece) return null;
  if (hints < HINTS) return { piece, square: null, marks: [] };
  return { piece, square: from, marks: [{ kind: 'ring', square: from, tone: 'plan' }] };
}
