import { clamp } from '#shared/math.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { EnginePool } from './engine/pool.ts';
import { Stockfish } from './engine/stockfish.ts';
import { isComplete } from './game/records.ts';
import type { Session } from './session.ts';

/** More engines barely help: the game's analysis is then held up by the cloud and the page. */
const MAX_ENGINES = 3;
/** Gigabytes of memory per engine, so a small machine keeps room for the rest of the browser. */
const GIGABYTES_PER_ENGINE = 2;
/** Without the device's memory (Firefox doesn't tell), no more than this. */
const UNKNOWN_MEMORY_ENGINES = 2;

/** The device's memory in gigabytes, rounded down by the browser (at most 8), if it tells. */
function deviceMemory(): number | null {
  const memory: unknown = Reflect.get(navigator, 'deviceMemory');
  return typeof memory === 'number' && memory > 0 ? memory : null;
}

/** One engine per core but one, left to the page, as far as the memory allows. */
export function engineCount(): number {
  const memory = deviceMemory();
  const byMemory =
    memory === null ? UNKNOWN_MEMORY_ENGINES : Math.floor(memory / GIGABYTES_PER_ENGINE);
  const byCores = (navigator.hardwareConcurrency || 2) - 1;
  return clamp(Math.min(byCores, byMemory), 1, MAX_ENGINES);
}

/** Lichess's Stockfish, booted for a game. */
export async function bootEngine(chess960: boolean): Promise<Stockfish> {
  const engine = new Stockfish({ chess960 });
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
      console.warn('[LichessReimagined] an extra engine failed to boot', error);
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
 * The page's engines, booted once: the game's analysis and the moves played
 * off it share them. A pool that failed stays failed.
 */
export function engineFor(session: Session, analysis: Analysis): Promise<EnginePool> {
  // Once the game is analysed (or read from the cache), only the moves played
  // and Explain need an engine.
  const count = isComplete(session.work) ? 1 : engineCount();
  session.engine ??= startEngines({ chess960: analysis.chess960, count });
  return session.engine;
}
