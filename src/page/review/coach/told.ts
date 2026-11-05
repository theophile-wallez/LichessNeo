import type { Reason } from './idea.ts';

// What the coach said why of on the moves just before: a move's reason said
// once isn't said again a ply later ("g4 allows Rc5, putting the rook behind
// the passed pawn", then "Rc5 was the answer"), nor as the same advice twice.

/** The ideas of the moves just before, those the move's comment tells, and the reasons it gives. */
export interface Told {
  readonly recent: ReadonlySet<string>;
  readonly now: Set<string>;
  readonly said: Set<string>;
}

/** How far back the coach remembers what it said: each side's two moves before. */
const RECALLED_PLIES = 4;

/** The moves before the one at `ply` whose comments count, from a game's moves (`ply - 1` each). */
export const recalled = <T>(moves: readonly T[], ply: number): T[] =>
  moves.slice(Math.max(0, ply - 1 - RECALLED_PLIES), Math.max(0, ply - 1));

/** A comment that knows nothing of the moves before. */
export const freshTold = (recent: ReadonlySet<string> = new Set()): Told => ({
  recent,
  now: new Set(),
  said: new Set(),
});

/**
 * Whether the idea `kind` of the move `uci` is news: no move just before told
 * it. It counts as told either way, for the moves after.
 */
export function isNew(told: Told, kind: string, uci: string): boolean {
  const idea = `${kind}:${uci}`;
  told.now.add(idea);
  return !told.recent.has(idea);
}

/**
 * `why` the move `uci` is played for, `reason` in words, unless it isn't news
 * or the comment gave that reason already, of another move.
 */
export function sayOnce(
  told: Told,
  reason: Reason,
  uci: string,
  why: string | null,
): string | null {
  const given = JSON.stringify(reason);
  if (!isNew(told, reason.kind, uci) || why === null || told.said.has(given)) return null;
  told.said.add(given);
  return why;
}
