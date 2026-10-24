import { afterEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const root = document.documentElement;
const press = (selector: string): void => queryOne(document, selector, HTMLElement)?.click();
const part = (selector: string): HTMLElement | null =>
  queryOne(document, `#ln-ext-review ${selector}`, HTMLElement);

it('folds the closed panel’s card to its buttons, as it was left, and keeps it while it redraws', async () => {
  const { advance } = setUp({ game: 'opera', lang: 'en', cached: false, steps: [] });
  localStorage.setItem('ln-ext-end-card-folded', '1');
  review.start();
  await advance(500);
  press('[data-ln-ext="normal"]');
  await advance(100);
  expect(root.classList.contains('ln-ext-review-folded')).toBe(true);

  const frame = part('.ln-ext-end__frame');
  const box = part('.ln-ext-end__top-inner');
  press('.ln-ext-end__fold--unfold');
  expect(root.classList.contains('ln-ext-review-folded')).toBe(false);
  expect(localStorage.getItem('ln-ext-end-card-folded')).toBe('0');
  // The analysis goes on, the card redrawn with it: the boxes that ease stay the same.
  const progress = part('.ln-ext-end__progress')?.textContent;
  await advance(3000);
  expect(part('.ln-ext-end__progress')?.textContent).not.toBe(progress);
  expect(part('.ln-ext-end__frame')).toBe(frame);
  expect(part('.ln-ext-end__top-inner')).toBe(box);

  press('.ln-ext-end__fold--fold');
  expect(root.classList.contains('ln-ext-review-folded')).toBe(true);
  expect(localStorage.getItem('ln-ext-end-card-folded')).toBe('1');
});
