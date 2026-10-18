import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from './fixtures/review-script.ts';
import { review } from './index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('leaves the free board to Lichess’s panel when the settings switch its coach off', async () => {
  const { ctrl, advance } = setUp({
    game: 'opera',
    lang: 'en',
    cached: false,
    synthetic: true,
    steps: [],
  });
  localStorage.setItem('ln-ext-coach-options', '{"motion":true,"analysis":false}');
  review.start();
  await advance(500);
  ctrl.playUci('e2e4');
  ctrl.redraw();
  await advance(3000);
  expect(document.getElementById('ln-ext-review')).toBeNull();
});
