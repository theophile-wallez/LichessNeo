import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const barShare = (): string | undefined =>
  document
    .querySelector<HTMLElement>('.ln-ext-evalbar__fill')
    ?.style.getPropertyValue('--ln-ext-bar-white');

const title = (): string | null | undefined =>
  document.querySelector('#ln-ext-review .ln-ext-bubble__title')?.textContent;

it('moves the board’s marks with a step, and draws the panel in the next frame', async () => {
  const { ctrl, advance } = setUp({ game: 'opera', lang: 'en', cached: true, steps: [] });
  review.start();
  await advance(500);
  ctrl.jumpToMain(10);
  ctrl.redraw();
  await advance(3000);
  const before = title();
  const share = barShare();
  const next = ctrl.mainline[11];
  if (!next?.uci) throw new Error('no move 11');
  ctrl.jump(`${ctrl.path}${next.id}`);
  await Promise.resolve();
  // The step's own frame shows the board's marks: the eval bar has moved on.
  expect(barShare()).not.toBe(share);
  expect(title()).toBe(before);
  await advance(20);
  expect(title()).toContain(next.uci.slice(2, 4));
});
