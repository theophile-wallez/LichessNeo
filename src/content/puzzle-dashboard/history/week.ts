import type { Round, Session } from './read.ts';

// What the history says beyond Lichess's numbers: the puzzles missed and not
// solved since, to retry, and the longest run of puzzles solved in a session.

/** Missed puzzles no later round solved, newest first, each once. */
export function toRetry(sessions: readonly Session[]): Round[] {
  const seen = new Set<string>();
  const missed: Round[] = [];
  for (const round of sessions.flatMap(session => session.rounds)) {
    if (seen.has(round.href)) continue;
    seen.add(round.href);
    if (!round.solved) missed.push(round);
  }
  return missed;
}

export interface Run {
  readonly length: number;
  /** When its session was played. */
  readonly at: Date;
}

const longestIn = (rounds: readonly Round[]): number => {
  let longest = 0;
  let current = 0;
  for (const round of rounds) {
    current = round.solved ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
};

/** The longest run of puzzles solved in one session since `since`, the latest if tied. */
export function bestRun(sessions: readonly Session[], since: Date): Run | null {
  let best: Run | null = null;
  for (const { at, rounds } of sessions) {
    if (!at || at < since) continue;
    const length = longestIn(rounds);
    if (length > 0 && length > (best?.length ?? 0)) best = { length, at };
  }
  return best;
}
