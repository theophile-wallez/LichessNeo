import { beforeEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { fitCardRoom } from './card-room.ts';

// The module keeps the first observer it makes, for the page: the fake's state outlives a test.
const observed = new Set<Element>();
let notify: (entries: ResizeObserverEntry[]) => void = () => {};

class FakeObserver {
  constructor(callback: ResizeObserverCallback) {
    notify = entries => callback(entries, this);
  }
  observe(target: Element): void {
    observed.add(target);
  }
  unobserve(target: Element): void {
    observed.delete(target);
  }
  disconnect(): void {
    observed.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeObserver);
  document.body.innerHTML =
    '<main class="analyse"><div class="ln-ext-review__panel"><div class="ln-ext-end__top-inner"><div class="ln-ext-end__card"></div></div></div></main>';
});

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

/** The browser telling `target` is `height` px tall, border included. */
const resized = (target: Element, height: number): ResizeObserverEntry => ({
  target,
  contentRect: new DOMRect(0, 0, 300, height),
  borderBoxSize: [{ blockSize: height, inlineSize: 300 }],
  contentBoxSize: [],
  devicePixelContentBoxSize: [],
});

it('hands the card’s height to the page, rounded up, as it changes', () => {
  fitCardRoom(element('.ln-ext-review__panel'));
  const card = element('.ln-ext-end__card');
  expect([...observed]).toEqual([card]);
  notify([resized(card, 211.2)]);
  const main = element('main.analyse');
  expect(main.style.getPropertyValue('--ln-ext-review-card')).toBe('212px');
  notify([resized(card, 160)]);
  expect(main.style.getPropertyValue('--ln-ext-review-card')).toBe('160px');
});

it('follows the card drawn anew on each pass, and lets the old one go', () => {
  const panel = element('.ln-ext-review__panel');
  fitCardRoom(panel);
  element('.ln-ext-end__top-inner').innerHTML = '<div class="ln-ext-end__card"></div>';
  fitCardRoom(panel);
  expect([...observed]).toEqual([element('.ln-ext-end__card')]);
});

it('follows no card but the one open: the folded strip’s is not its', () => {
  element('.ln-ext-end__top-inner').innerHTML =
    '<div class="ln-ext-end__peek"><div class="ln-ext-end__card"></div></div>';
  fitCardRoom(element('.ln-ext-review__panel'));
  expect(observed.size).toBe(0);
});
