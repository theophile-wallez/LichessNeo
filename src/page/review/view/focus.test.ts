import { afterEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('keeps the focus in the review when a click redraws its button away', async () => {
  const { advance } = setUp({ game: 'passant', lang: 'en', cached: true, steps: [] });
  review.start();
  await advance(500);
  const count = queryOne(document, '#ln-ext-review [data-ln-ext="jump"]', HTMLButtonElement);
  if (!count) throw new Error('no count to click');
  count.focus();
  count.click();
  await advance(100);
  expect(count.isConnected).toBe(false);
  expect(document.activeElement?.closest('#ln-ext-review')).not.toBeNull();
});
