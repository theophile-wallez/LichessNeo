import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { FINISHED_GAME, openLichess } from './support/lichess.ts';
import {
  recordReview,
  REVIEW_CACHE,
  reviewParts,
  shouldRecordReview,
  storedReview,
} from './support/review.ts';

// The Game Review without its cache: Lichess's Stockfish build in the page,
// about a minute on a fast machine. Its verdicts vary from run to run, so
// only the analysis itself is checked: it moves on, and it completes.

const ANALYSIS_MS = 8 * 60_000;

async function progress(percent: Locator): Promise<number> {
  const text = (await percent.textContent()) ?? '';
  return Number(/(\d+)%/.exec(text)?.[1] ?? Number.NaN);
}

test(
  'analyses a game with the engine, then keeps its review',
  { tag: '@slow' },
  async ({ page }) => {
    test.setTimeout(ANALYSIS_MS + 60_000);
    const { panel, start } = reviewParts(page);
    await openLichess(page, FINISHED_GAME.path);
    const percent = panel.locator('.ln-ext-summary-graph .ln-ext-summary-pct');
    await expect(percent).toHaveText(/^\d+%$/);
    const started = await progress(percent);
    await expect.poll(() => progress(percent), { timeout: ANALYSIS_MS }).toBeGreaterThan(started);
    // The quick pass drafts the review within seconds: it can start before the end.
    await expect(start).toBeEnabled();
    await expect(percent).toHaveCount(0, { timeout: ANALYSIS_MS });
    await expect(panel.locator('.ln-ext-review__top .ln-ext-acc--w')).toHaveText(/^\d{1,3}\.\d$/);

    await expect.poll(() => storedReview(page, FINISHED_GAME.id)).not.toBeNull();
    const stored = await storedReview(page, FINISHED_GAME.id);
    if (stored === null) throw new Error('the review wasn’t kept');
    if (shouldRecordReview()) {
      recordReview(stored);
      return;
    }
    // A new key (the cache's version bumped) leaves the other tests without a cache.
    expect(stored.storageKey, 'the key changed: record again with LN_EXT_RECORD_REVIEW=1').toBe(
      REVIEW_CACHE.storageKey,
    );
    expect(stored.records).toHaveLength(REVIEW_CACHE.records.length);
  },
);
