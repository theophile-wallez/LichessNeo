import { afterEach, expect, it, vi } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { EnginePool, type PoolEngine } from './engine/pool.ts';
import { setUp, useFakeEngine } from './fixtures/review-script.ts';
import { newSession } from './fixtures/unit-review.ts';
import { analyseLive } from './live/lookups.ts';
import { engineFor, startEngines } from './engine-pool.ts';

afterEach(() => {
  vi.useRealTimers();
});

it('boots no more engines once the pool is ended', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const booted = useFakeEngine(ctrl);
  const pool = await startEngines({ chess960: false, count: 3 });
  pool.end();
  await advance(1000);
  // The second was already booting: it's ended as it comes in.
  expect(booted()).toBe(2);
  expect(pool.size).toBe(0);
});

/** The page's controller, as the review reads it. */
function page() {
  const scenario = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const facade = analysis();
  if (!facade) throw new Error('no controller');
  return { ...scenario, facade, booted: useFakeEngine(scenario.ctrl), session: newSession() };
}

/** An engine that goes quiet on its first search, and leaves the pool. */
function losing(): PoolEngine {
  let running = true;
  return {
    get running() {
      return running;
    },
    analyse: () => {
      running = false;
      return Promise.reject(new Error('gone quiet'));
    },
    quit: () => {},
  };
}

it('boots the engines again once every one is lost, but not once they failed to boot', async () => {
  const { advance, facade, booted, session } = page();
  const lost = new EnginePool([]);
  session.engine = Promise.resolve(lost);
  const again = engineFor(session, facade);
  await advance(1000);
  const pool = await again;
  expect(pool).not.toBe(lost);
  expect(pool.size).toBeGreaterThan(0);
  const failed = Promise.reject(new Error('no shared memory'));
  session.engine = failed;
  await expect(engineFor(session, facade)).rejects.toThrow('no shared memory');
  expect(session.engine).toBe(failed);
  expect(booted()).toBe(1);
});

it('searches a move played again when the last engine is lost on it', async () => {
  const { advance, facade, booted, session } = page();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  session.engine = Promise.resolve(new EnginePool([losing()]));
  const { fen } = facade.node;
  const searched = analyseLive(session, facade, fen);
  await advance(3000);
  await searched;
  expect(session.live.error).toBeNull();
  expect(session.live.evals.has(fen)).toBe(true);
  expect(booted()).toBe(1);
});
