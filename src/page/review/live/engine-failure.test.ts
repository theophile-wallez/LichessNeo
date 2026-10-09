import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { en } from '#page/review/i18n/en.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('tells a move played on the free board that the engine failed to start', async () => {
  const { ctrl, advance } = setUp({
    game: 'opera',
    lang: 'en',
    cached: false,
    synthetic: true,
    steps: [],
  });
  Reflect.set(globalThis, 'lrExtFakeStockfish', () => {
    throw new RangeError('no shared memory');
  });
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  review.start();
  await advance(500);
  ctrl.playUci('e2e4');
  ctrl.redraw();
  await advance(3000);
  const title = document.querySelector('#lr-ext-review .lr-ext-bubble__title');
  expect(title?.textContent).toBe(en.ui.engineError);
  expect(logged).toHaveBeenCalledWith('[LichessReimagined] engine failed', expect.any(RangeError));
  // Nothing more is asked of an engine that isn't there.
  ctrl.playUci('e7e5');
  ctrl.redraw();
  await advance(3000);
  expect(logged).toHaveBeenCalledTimes(1);
});
