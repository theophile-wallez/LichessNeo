import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { analysis, type Analysis } from '#page/lichess/analysis.ts';
import { EnginePool } from '#page/review/engine/pool.ts';
import { pickReviewEngine } from '#page/review/engine/review-engine.ts';
import { fixtureGame, setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { analyseGame } from './analyse-game.ts';
import { cacheProgress, cacheRecords } from './cache.ts';
import { reanalyse } from './reanalyse.ts';

// The passant game's 25 positions, as the cache keeps them.
const DONE_KEY = 'ln-ext-review:passanta:25:v3';
const PROGRESS_KEY = 'ln-ext-review-progress:passanta:25:v3';

interface Search {
  readonly depth: number;
  readonly fen: string;
}

interface Page {
  readonly facade: Analysis;
  readonly session: Session;
  readonly advance: (milliseconds: number) => Promise<void>;
  /** The searches the engines were sent, in order. */
  readonly searches: Search[];
  readonly booted: () => number;
}

/** The passant game on its page, its first `found` positions found at depth `depth`. */
function page(found: number, depth: number): Page {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const searches: Search[] = [];
  const booted = useFakeEngine(ctrl, search => {
    searches.push({ depth: search.depth, fen: search.fen });
    return search.depth >= 16 ? 150 : 30;
  });
  const facade = analysis();
  if (!facade) throw new Error('no controller');
  const session = newSession();
  const { work } = session;
  work.nodes = facade.mainline;
  work.aim = { depth, engine: 'light' };
  const records = fixtureGame('passant').records.slice(0, found);
  for (const [i, record] of records.entries()) work.deep[i] = record;
  work.cloud.add(0);
  cacheProgress({ gameId: 'passanta', positions: 25, records, analysed: work.aim });
  return { facade, session, advance, searches, booted };
}

const deepFens = (searches: readonly Search[], depth: number): Set<string> =>
  new Set(searches.filter(search => search.depth === depth).map(search => search.fen));

afterEach(() => {
  vi.useRealTimers();
  pickReviewEngine(DEFAULT_REVIEW_ENGINE);
});

describe('a re-analysis', () => {
  it('drops the records the new settings find too shallow, and finds them all again at them', async () => {
    const { facade, session, advance, searches } = page(10, 16);
    const { work, view } = session;
    view.progress = 0.4;
    pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, depth: 20 });
    const done = reanalyse(session, facade);
    expect(work.deep.filter(Boolean)).toHaveLength(0);
    expect(work.cloud.size).toBe(0);
    expect([view.review, view.progress]).toEqual([null, 0]);
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    await advance(20_000);
    await done;
    expect(work.deep.filter(Boolean)).toHaveLength(25);
    expect(work.analysed).toEqual({ depth: 20, engine: 'light' });
    expect(deepFens(searches, 16).size).toBe(0);
    expect(deepFens(searches, 20).size).toBeGreaterThan(20);
    expect(localStorage.getItem(DONE_KEY)).toMatch(/^\{"analysed":\{"depth":20,"engine":"light"\}/);
  });

  it('keeps the records as fine as lower settings ask, and searches the rest only', async () => {
    const { facade, session, advance, searches } = page(10, 20);
    const kept = session.work.deep.slice(0, 10);
    pickReviewEngine(DEFAULT_REVIEW_ENGINE);
    const done = reanalyse(session, facade);
    await advance(20_000);
    await done;
    const { work } = session;
    expect(work.deep.slice(0, 10)).toEqual(kept);
    expect(work.deep.filter(Boolean)).toHaveLength(25);
    const searched = deepFens(searches, 16);
    expect(facade.mainline.slice(0, 10).filter(node => searched.has(node.fen))).toEqual([]);
    expect(facade.mainline.slice(10).filter(node => searched.has(node.fen))).toHaveLength(15);
  });

  it('stops the run going on and ends its engines, booted again at the new settings', async () => {
    const { facade, session, advance, searches, booted } = page(0, 16);
    localStorage.clear();
    void analyseGame(session, facade);
    await advance(1500);
    expect(booted()).toBe(1);
    const before = searches.length;
    const ended = vi.spyOn(EnginePool.prototype, 'end');
    pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, depth: 24 });
    const done = reanalyse(session, facade);
    await advance(20_000);
    await done;
    expect(ended).toHaveBeenCalledTimes(1);
    expect(booted()).toBe(2);
    // The search under way as it started over found its position for the run before: not kept.
    const searched = deepFens(searches.slice(before), 24);
    const { cloud } = session.work;
    const missed = facade.mainline.filter((node, i) => !cloud.has(i) && !searched.has(node.fen));
    expect(missed).toEqual([]);
    expect(searches.slice(before).some(search => search.depth === 16)).toBe(false);
    expect(session.work.analysed).toEqual({ depth: 24, engine: 'light' });
  });

  it('isn’t needed for a game kept deeper than asked: it says what it has, no engine booted', async () => {
    const { facade, session, advance, booted } = page(0, 16);
    const records = fixtureGame('passant').records;
    const analysed = { depth: 22, engine: 'full' } as const;
    cacheRecords({ gameId: 'passanta', positions: 25, records, analysed });
    const done = analyseGame(session, facade);
    await advance(1000);
    await done;
    expect(session.work.analysed).toEqual(analysed);
    expect(booted()).toBe(0);
  });
});
