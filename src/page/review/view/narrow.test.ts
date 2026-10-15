import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// The review on a phone's width, where the page lays it out in one column.
// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('reviews on a phone: its state stays on <html>, its badge on the board', async () => {
  Reflect.set(window, 'innerWidth', 390);
  expect(matchMedia('(min-width: 1020px)').matches).toBe(false);
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: true, steps: [] });
  review.start();
  await advance(500);
  const root = document.documentElement;
  // What Lichess does when its scheme follows the device's.
  root.className = 'dark';
  await advance(200);
  expect(root.classList.contains('lr-ext-review')).toBe(true);
  expect(root.classList.contains('lr-ext-review-summary')).toBe(true);

  ctrl.jumpToMain(3);
  ctrl.redraw();
  await advance(800);
  expect(root.classList.contains('lr-ext-review-moves')).toBe(true);
  expect(document.querySelector('#lr-ext-board-overlay .lr-ext-badge')).not.toBeNull();
});
