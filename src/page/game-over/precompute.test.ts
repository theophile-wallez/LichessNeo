import { afterEach, describe, expect, it, vi } from 'vitest';
import { Stockfish } from '#page/review/engine/stockfish.ts';
import { bootEngine } from '#page/review/engine-pool.ts';
import {
  fixtureGame,
  SCRIPT_DELAY,
  setUp,
  useFakeEngine,
} from '#page/review/fixtures/review-script.ts';
import { precomputeReview, type PrecomputeInput } from './precompute.ts';

// The review's analysis on the game page, on the fake Stockfish and a fake
// clock. The cloud knows the game's first two positions (review-script.ts).

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

const GAME = fixtureGame('passant');
const CACHE_KEY = `lr-ext-review:passanta:${GAME.nodes.length}:v1`;
const PROGRESS_KEY = `lr-ext-review-progress:passanta:${GAME.nodes.length}:v1`;

interface Searches {
  deep: number;
  quick: number;
}

/** The fake game page: what the engines search, counted by depth. */
function gamePage(cached = false) {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached, steps: [] });
  const searches: Searches = { deep: 0, quick: 0 };
  useFakeEngine(ctrl, search => {
    if (search.depth >= 16) searches.deep++;
    else searches.quick++;
    return SCRIPT_DELAY(search);
  });
  const quits = vi.spyOn(Stockfish.prototype, 'quit');
  return { advance, searches, quits };
}

async function input(overrides: Partial<PrecomputeInput> = {}): Promise<PrecomputeInput> {
  return {
    gameId: GAME.id,
    positions: GAME.nodes,
    variant: 'standard',
    engine: await bootEngine(false),
    stillOver: () => true,
    ...overrides,
  };
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('precomputeReview', () => {
  it('analyses every position at full depth, caches them for the review, then ends its engines', async () => {
    const { advance, searches, quits } = gamePage();
    // Room for two engines: the quick look's, and another.
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    const done = precomputeReview(await input());
    await advance(10_000);
    const records = await done;
    expect(records).toHaveLength(GAME.nodes.length);
    expect(records?.every(record => record !== undefined)).toBe(true);
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    // The cloud had two; no quick pass, as nobody sees the graph.
    expect(searches).toEqual({ deep: GAME.nodes.length - 2, quick: 0 });
    expect(quits).toHaveBeenCalledTimes(2);
  });

  it('stops once the page moves on to another game, its progress saved', async () => {
    const { advance, searches, quits } = gamePage();
    let over = true;
    const done = precomputeReview(await input({ stillOver: () => over }));
    await advance(1000);
    over = false;
    await advance(1000);
    expect(await done).toBeNull();
    const searched = searches.deep;
    await advance(10_000);
    expect(searches.deep).toBe(searched);
    expect(searched).toBeLessThan(GAME.nodes.length - 2);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(localStorage.getItem(PROGRESS_KEY)).not.toBeNull();
    expect(quits).toHaveBeenCalledTimes(1);
  });

  it('leaves a game the cache already has', async () => {
    const { advance, searches, quits } = gamePage(true);
    const done = precomputeReview(await input());
    await advance(1000);
    expect(await done).toEqual(GAME.records);
    expect(searches).toEqual({ deep: 0, quick: 0 });
    expect(quits).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a variant the review doesn’t judge', { variant: 'atomic' }],
    ['a game without a move', { positions: GAME.nodes.slice(0, 1) }],
    ['a page already on another game', { stillOver: () => false }],
  ])('leaves %s', async (_, overrides) => {
    const { advance, searches, quits } = gamePage();
    const done = precomputeReview(await input(overrides));
    await advance(1000);
    await done;
    expect(searches).toEqual({ deep: 0, quick: 0 });
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(quits).toHaveBeenCalledTimes(1);
  });

  it('ends its engines once the tab is hidden, its progress saved', async () => {
    const { advance, searches, quits } = gamePage();
    const done = precomputeReview(await input());
    await advance(1000);
    setHidden(true);
    await advance(1000);
    expect(await done).toBeNull();
    const searched = searches.deep;
    expect(searched).toBeGreaterThan(0);
    expect(searched).toBeLessThan(GAME.nodes.length - 2);
    expect(localStorage.getItem(PROGRESS_KEY)).not.toBeNull();
    expect(quits).toHaveBeenCalledTimes(1);
    setHidden(false);
    await advance(10_000);
    expect(searches.deep).toBe(searched);
  });

  it('boots nothing more in a tab already hidden', async () => {
    const { advance, searches, quits } = gamePage();
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    setHidden(true);
    const done = precomputeReview(await input());
    await advance(1000);
    expect(await done).toBeNull();
    expect(searches.deep).toBe(0);
    // The quick look's engine only.
    expect(quits).toHaveBeenCalledTimes(1);
  });
});
