import { afterEach, expect, it, vi } from 'vitest';
import { parentPath } from '#page/lichess/tree.ts';
import type { FakeController } from '#page/review/fixtures/fake-lichess.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// Explain on a move that wasn't best, through the whole review: its lines in
// the bubble, then the best one played on the board. A started review can't
// be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const text = (selector: string): string =>
  document.querySelector(`#ln-ext-review ${selector}`)?.textContent ?? '';

function click(selector: string): void {
  document
    .querySelector(`#ln-ext-review ${selector}`)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** The moves from the node at `from` to the one on the board. */
function playedSince(ctrl: FakeController, from: string): string[] {
  const moves: string[] = [];
  for (let at = ctrl.path; at.length > from.length; at = parentPath(at))
    moves.unshift(ctrl.tree.nodeAtPath(at).uci ?? '');
  return moves;
}

it('writes the lines around a mistake, and plays the best one on the board', async () => {
  const { ctrl, advance } = setUp({ game: 'opera', lang: 'en', cached: true, steps: [] });
  review.start();
  await advance(500);
  click('[data-ln-ext="moves"]');
  await advance(1500);
  ctrl.jumpToMain(14);
  ctrl.redraw();
  await advance(1500);
  const move = ctrl.path;
  const title = text('.ln-ext-bubble__title');
  expect(title).toBe('♛e7 is an inaccuracy');
  click('[data-ln-ext="explain"]');
  await advance(1000);
  // The chips draw the pieces: only the squares show as text.
  expect(text('.ln-ext-bubble__sub')).toBe(
    'Best was 7... c5 8. a3 a6 9. a4. e7 allows 8. d1 a6 9. a3. ',
  );
  expect(text('[data-ln-ext="line"]')).toBe('Show line');

  click('[data-ln-ext="line"]');
  await advance(0);
  expect(playedSince(ctrl, parentPath(move))).toEqual(['f8c5']);
  await advance(900 * 4);
  expect(playedSince(ctrl, parentPath(move))).toEqual(['f8c5', 'a2a3', 'a7a6', 'a3a4']);
  // The coach still speaks of the move the line stands for.
  expect(text('.ln-ext-bubble__title')).toBe(title);
  expect(text('[data-ln-ext="line"]')).toBe('Back');
  expect(
    document.querySelector('#ln-ext-review [data-ln-ext="best"]')?.hasAttribute('disabled'),
  ).toBe(true);
  click('[data-ln-ext="line"]');
  await advance(500);
  expect(ctrl.path).toBe(move);

  // Explain off, halfway through the line, goes back to the move and stops there.
  click('[data-ln-ext="line"]');
  await advance(900);
  click('[data-ln-ext="explain"]');
  await advance(3000);
  expect(ctrl.path).toBe(move);
  expect(document.querySelector('#ln-ext-review [data-ln-ext="line"]')).toBeNull();
}, 30_000);
