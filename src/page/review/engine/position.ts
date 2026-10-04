import { normalizeUci } from '#page/review/chess/notation.ts';

// What the engine's `position` command is given. A FEN alone hides the moves
// that led to it, so the engine can't see a repetition: a position a game
// reaches is given with its moves since the last capture or pawn move, the
// only ones a repetition can reach back to.

export interface PathPosition {
  readonly fen: string;
  /** The move that led here, in Lichess's notation. */
  readonly uci?: string | undefined;
}

/** The FEN's halfmove clock: plies since the last capture or pawn move (0 when it has none). */
function halfmoveClock(fen: string): number {
  const clock = Number(fen.split(' ')[4]);
  return Number.isInteger(clock) && clock > 0 ? clock : 0;
}

/** `fen …` for the last position of `path`, then `moves …` from its last irreversible move. */
export function uciPosition(path: readonly PathPosition[], chess960: boolean): string {
  const last = path.at(-1);
  if (!last) throw new Error('A position needs a path');
  const start = Math.max(0, path.length - 1 - halfmoveClock(last.fen));
  const moves: string[] = [];
  for (let i = start + 1; i < path.length; i++) {
    const uci = normalizeUci(path[i]?.uci, path[i - 1]?.fen ?? '', chess960);
    if (uci === undefined) return `fen ${last.fen}`;
    moves.push(uci);
  }
  const from = path[start];
  return from && moves.length > 0 ? `fen ${from.fen} moves ${moves.join(' ')}` : `fen ${last.fen}`;
}
