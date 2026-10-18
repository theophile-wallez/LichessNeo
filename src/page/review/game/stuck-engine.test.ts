import { afterEach, expect, it, vi } from 'vitest';
import { SCRIPT_DELAY, setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('carries on when one engine of several stops answering', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  // The second engine never answers.
  useFakeEngine(ctrl, search => (search.engine === 1 ? null : SCRIPT_DELAY(search)));
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  review.start();
  await advance(30_000);
  expect(logged).not.toHaveBeenCalled();
  expect(document.querySelector('#ln-ext-review .ln-ext-review__error')).toBeNull();
  expect(localStorage.getItem(`ln-ext-review:passanta:${ctrl.mainline.length}:v1`)).not.toBeNull();
});
