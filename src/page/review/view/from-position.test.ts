import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const panel = (selector: string): Element | null =>
  document.querySelector(`#ln-ext-review ${selector}`);

const click = (selector: string): void => {
  const button = document.querySelector(selector);
  if (!(button instanceof HTMLElement)) throw new Error(`No button ${selector}`);
  button.click();
};

// Lichess numbers a game from a position from its FEN's move: its tree's root
// is ply 200 there, where the review counts from 0.
const ROOT_PLY = 200;

it('reviews a game from a position, whose moves Lichess numbers from its FEN', async () => {
  const { ctrl, advance } = setUp({
    game: 'opera',
    lang: 'en',
    cached: true,
    rootPly: ROOT_PLY,
    steps: [],
  });
  review.start();
  await advance(500);
  ctrl.jumpToMain(ROOT_PLY + 10);
  ctrl.redraw();
  await advance(3000);
  // The game's own verdict on its 10th move, not the spinner.
  expect(panel('.ln-ext-bubble__spin')).toBeNull();
  expect(panel('.ln-ext-bubble__title')?.textContent).toContain(ctrl.node.san);
  // The key moments are numbered as Lichess numbers the moves.
  const label = panel('.ln-ext-moment__move')?.textContent ?? '';
  expect(Number.parseInt(label, 10)).toBeGreaterThan(ROOT_PLY / 2);
  // The last button goes to the game's last move, the first to its start.
  click('[data-ln-ext="last"]');
  await advance(400);
  expect(ctrl.node).toBe(ctrl.mainline.at(-1));
  click('[data-ln-ext="first"]');
  await advance(400);
  expect(ctrl.node).toBe(ctrl.tree.root);
});
