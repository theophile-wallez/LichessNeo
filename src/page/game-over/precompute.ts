import type { EnginePool } from '#page/review/engine/pool.ts';
import type { Stockfish } from '#page/review/engine/stockfish.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { startEngines } from '#page/review/engine-pool.ts';
import { analyseRecords } from '#page/review/game/analyse-records.ts';
import { isComplete, newRecordsWork } from '#page/review/game/records.ts';
import type { GamePosition } from '#page/review/judge/types.ts';
import { REVIEWED_VARIANTS } from '#page/review/variants.ts';

// Game Review's analysis, run on the game page once the coach's quick look
// is done: the same searches, cached under the key the review reads, so
// opening it shows the review at once. Only once the game is over: Lichess's
// fair play rules allow no engine during a game.

export interface PrecomputeInput {
  readonly gameId: string;
  /** The game's start, then one position per move: the analysis page's mainline. */
  readonly positions: readonly GamePosition[];
  readonly variant: string;
  /** The quick look's engine, which the analysis takes over; booted here without one. */
  readonly engine: Stockfish | undefined;
  /** False once the page has moved on from the game (to another one). */
  readonly stillOver: () => boolean;
}

/** Whether the review would analyse the game: one it judges, with a move at least. */
export const worthReviewing = (variant: string, positions: number): boolean =>
  REVIEWED_VARIANTS.has(variant) && positions >= 2;

/** Records the review's analysis of the game; its records once they're all in, else null. */
export async function precomputeReview(
  input: PrecomputeInput,
): Promise<readonly (PositionRecord | undefined)[] | null> {
  const { gameId, positions, variant, engine, stillOver } = input;
  const chess960 = variant === 'chess960';
  const booted: { pool?: Promise<EnginePool> } = {};
  try {
    if (!worthReviewing(variant, positions.length) || !stillOver()) return null;
    const work = newRecordsWork(positions);
    await analyseRecords({
      gameId,
      chess960,
      work,
      engines: () => (booted.pool ??= startEngines({ chess960, first: engine })),
      whenFree: () => Promise.resolve(),
      // Nobody sees the graph here: the full depth only.
      draft: false,
      // A hidden tab keeps no engine: the review takes up the progress saved.
      stopped: () => document.hidden || !stillOver(),
      onFailure: (what, error) =>
        console.warn(`[LichessReimagined] game over review: ${what}`, error),
    });
    return isComplete(work) ? work.deep : null;
  } finally {
    // Nothing else on the game page needs an engine: they weigh on it.
    if (booted.pool) void booted.pool.then(pool => pool.end());
    else engine?.quit();
  }
}
