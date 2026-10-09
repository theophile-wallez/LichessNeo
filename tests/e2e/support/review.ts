import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { z } from 'zod/mini';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { StoredRecordSchema } from '#page/review/evaluation/stored.ts';

// The Game Review of FINISHED_GAME. The engine takes a minute and never
// judges twice alike, so most tests start from its cache: every position
// at full depth, as this extension stored it once the analysis was done.
// The @slow review test records it again with LR_EXT_RECORD_REVIEW=1.

/** Any of the review's verdicts, as it writes them in `data-lr-ext-cls`. */
export const VERDICT = new RegExp(`^(${MOVE_CLASSES.join('|')})$`);

const ReviewCacheSchema = z.object({
  storageKey: z.string().check(z.startsWith('lr-ext-review:')),
  records: z.array(StoredRecordSchema).check(z.minLength(2)),
});

export type ReviewCache = z.infer<typeof ReviewCacheSchema>;

const FIXTURE_FILE = path.join(import.meta.dirname, '..', 'fixtures', 'review-tKlG0mrQ.json');

export const REVIEW_CACHE: ReviewCache = ReviewCacheSchema.parse(
  JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')),
);

/** Puts the cached review in every page's storage, before Lichess's scripts run. */
export async function seedReviewCache(context: BrowserContext): Promise<void> {
  const entry = { key: REVIEW_CACHE.storageKey, value: JSON.stringify(REVIEW_CACHE.records) };
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), entry);
}

/** The review the extension cached for `gameId` on `page`, or null while its analysis runs. */
export async function storedReview(page: Page, gameId: string): Promise<ReviewCache | null> {
  const prefix = `lr-ext-review:${gameId}:`;
  const stored = await page.evaluate(start => {
    const key = Object.keys(localStorage).find(name => name.startsWith(start));
    return key === undefined ? null : { key, value: localStorage.getItem(key) ?? '' };
  }, prefix);
  if (stored === null) return null;
  const records: unknown = JSON.parse(stored.value);
  return ReviewCacheSchema.parse({ storageKey: stored.key, records });
}

export const shouldRecordReview = (): boolean => process.env['LR_EXT_RECORD_REVIEW'] === '1';

export function recordReview(cache: ReviewCache): void {
  writeFileSync(FIXTURE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
}

/** The review's elements, as the page script adds them to the analysis page. */
export function reviewParts(page: Page) {
  const panel = page.locator('#lr-ext-review');
  return {
    panel,
    start: panel.locator('.lr-ext-review__foot [data-lr-ext="moves"]'),
    close: panel.locator('.lr-ext-review__close'),
    reopen: panel.locator('.lr-ext-review__open'),
    bubbleTitle: panel.locator('.lr-ext-bubble .lr-ext-bubble__title'),
    comment: panel.locator('.lr-ext-bubble .lr-ext-bubble__sub'),
    avatar: panel.locator('.lr-ext-coach__avatar'),
    explain: panel.locator('.lr-ext-review__nav [data-lr-ext="explain"]'),
    best: panel.locator('.lr-ext-review__nav [data-lr-ext="best"]'),
    next: panel.locator('.lr-ext-review__nav [data-lr-ext="next"]'),
    controls: page.locator('#lr-ext-review-controls'),
    badge: page.locator('#lr-ext-board-overlay .lr-ext-badge'),
    evalBar: page.locator('#lr-ext-evalbar'),
    arrows: page.locator('#lr-ext-shapes .lr-ext-shapes__arrows polygon'),
  };
}
