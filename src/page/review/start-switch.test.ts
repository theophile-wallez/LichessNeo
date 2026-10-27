import { afterEach, expect, it, vi } from 'vitest';
import { setUp } from './fixtures/review-script.ts';
import { review } from './index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

// The content script telling of the settings' coach switches (#shared/protocol.ts).
const switchCoach = (analysis: boolean): void => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'ln-ext:coach-options', options: { motion: true, analysis, board: true } },
      source: window,
    }),
  );
};

const panel = (): HTMLElement | null => document.getElementById('ln-ext-review');
const marked = (): boolean => document.documentElement.classList.contains('ln-ext-review-live');

it('turns the free board’s coach on and off as the settings switch it, the board left open', async () => {
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
  await advance(1000);
  expect(panel()).toBeNull();

  switchCoach(true);
  await advance(1000);
  expect(panel()?.isConnected).toBe(true);
  expect(marked()).toBe(true);

  switchCoach(false);
  await advance(1000);
  expect(panel()).toBeNull();
  expect(document.getElementById('ln-ext-evalbar')).toBeNull();
  expect(marked()).toBe(false);
  expect(document.documentElement.classList.contains('ln-ext-review')).toBe(false);

  switchCoach(true);
  await advance(1000);
  expect(panel()?.isConnected).toBe(true);
  expect(marked()).toBe(true);
});
