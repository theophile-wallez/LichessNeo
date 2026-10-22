import { afterEach, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { someMove } from '#page/review/fixtures/fake-chess.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { en } from '#page/review/i18n/en.ts';
import { review } from '#page/review/index.ts';
import { CURSOR_COLOR } from './graph-markup.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const bubbleText = (): string =>
  document.querySelector('#ln-ext-review .ln-ext-bubble')?.textContent ?? '';

it('judges a move played on from the game’s last position', async () => {
  const { ctrl, advance } = setUp({ game: 'opera', lang: 'en', cached: true, steps: [] });
  review.start();
  await advance(500);
  const last = ctrl.mainline.length - 1;
  ctrl.jumpToMain(last);
  ctrl.redraw();
  await advance(3000);
  // Lichess grows its mainline with the move: the board stays "on the mainline".
  ctrl.playUci(someMove(ctrl.node.fen) ?? 'a2a3');
  ctrl.redraw();
  await advance(3000);
  expect(ctrl.onMainline).toBe(true);
  expect(ctrl.node.ply).toBe(last + 1);
  expect(bubbleText()).not.toContain(en.ui.thinking);
  expect(document.querySelector('#ln-ext-review .ln-ext-bubble__title')?.textContent).toContain(
    ctrl.node.san,
  );
  // The move list gives it its badge, as for a variation's move.
  const played = queryAll(document, '.tview2 move[p]', HTMLElement).find(
    move => move.getAttribute('p') === ctrl.path,
  );
  expect(played?.dataset.lnExtCls).toBeTruthy();
  // The graph's cursor stays on the game's last position, inside the graph.
  const svg = document.querySelector('#ln-ext-review-graph svg');
  const cursor = svg?.querySelector(`line[stroke="${CURSOR_COLOR}"]`);
  expect(cursor).toBeTruthy();
  expect(Number(cursor?.getAttribute('x1'))).toBe(Number(svg?.getAttribute('width')));
});
