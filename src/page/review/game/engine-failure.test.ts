import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { en } from '#page/review/i18n/en.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('says the engine failed to start, rather than analyzing forever', async () => {
  const { advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  // A browser refusing the engine's shared memory, say.
  Reflect.set(globalThis, 'lnExtFakeStockfish', () => {
    throw new RangeError('no shared memory');
  });
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  review.start();
  await advance(3000);
  const error = document.querySelector('#ln-ext-review .ln-ext-review__error');
  expect(error?.textContent).toBe(en.ui.engineError);
  expect(document.querySelector('#ln-ext-review .ln-ext-summary-pct')).toBeNull();
  expect(logged).toHaveBeenCalledWith('[LichessNeo] engine boot failed', expect.any(RangeError));
});
