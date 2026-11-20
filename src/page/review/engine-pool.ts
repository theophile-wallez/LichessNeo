import { engineCount as countEngines } from '#shared/review-engine/device.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { EnginePool } from './engine/pool.ts';
import { reviewEngine } from './engine/review-engine.ts';
import { Stockfish } from './engine/stockfish.ts';
import { isComplete } from './game/records.ts';
import type { Session } from './session.ts';

/** The engines the settings make: one per core, each with its threads. */
export const engineCount = (): number => countEngines(reviewEngine());

/** Lichess's Stockfish, booted for a game: the network, threads and table the settings pick. */
export async function bootEngine(chess960: boolean): Promise<Stockfish> {
  const { engine: kind, threads, hash } = reviewEngine();
  const engine = new Stockfish({ chess960, engine: kind, threads, hash });
  await engine.boot();
  return engine;
}

/** The engines past the first, booted one after another; one that fails ends it. */
async function bootMore(pool: EnginePool, chess960: boolean, count: number): Promise<void> {
  // A pool cut down by `keep` or `end` takes no more.
  for (let booted = 1; booted < count && pool.hasRoom; booted++) {
    try {
      pool.add(await bootEngine(chess960));
    } catch (error) {
      // The browser short of memory, say: the engines already up carry on.
      console.warn('[LichessNeo] an extra engine failed to boot', error);
      return;
    }
  }
}

export interface EnginesOptions {
  readonly chess960: boolean;
  /** How many engines, the first included: `engineCount()` unless given. */
  readonly count?: number;
  /** An engine already booted for the game, taken as the first. */
  readonly first?: Stockfish | undefined;
}

/**
 * A pool of engines: it comes with the first, and takes the others as they
 * boot, one at a time. If the first fails to boot, the pool fails.
 */
export async function startEngines({
  chess960,
  count = engineCount(),
  first,
}: EnginesOptions): Promise<EnginePool> {
  const pool = new EnginePool([first ?? (await bootEngine(chess960))]);
  void bootMore(pool, chess960, count);
  return pool;
}

/**
 * The page's engines: the game's analysis and the moves played off it share
 * them. A pool that failed to boot stays failed; one that lost every engine
 * (each gone quiet, on a busy machine) is booted again, or every search to
 * come would fail until the page is reloaded.
 */
export async function engineFor(session: Session, analysis: Analysis): Promise<EnginePool> {
  // Once the game is analysed (or read from the cache), only the moves played
  // and Explain need an engine.
  const start = (): Promise<EnginePool> =>
    startEngines({
      chess960: analysis.chess960,
      count: isComplete(session.work) ? 1 : engineCount(),
    });
  const current = (session.engine ??= start());
  const pool = await current;
  // Two searches may find it empty at once: the first boots the new one.
  if (pool.size === 0 && session.engine === current) session.engine = start();
  return session.engine;
}
