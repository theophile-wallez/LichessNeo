import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('saves the analysis’s progress before it’s complete', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  review.start();
  // One engine: a quick pass of 25 × 30 ms, then 150 ms a position at full depth.
  await advance(2500);
  const positions = ctrl.mainline.length;
  expect(localStorage.getItem(`ln-ext-review:passanta:${positions}:v3`)).toBeNull();
  const saved: unknown = JSON.parse(
    localStorage.getItem(`ln-ext-review-progress:passanta:${positions}:v3`) ?? '[]',
  );
  expect(
    Array.isArray(saved) && saved.filter(record => record !== null).length,
  ).toBeGreaterThanOrEqual(8);
});
