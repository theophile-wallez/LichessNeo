import { closestTo, queryOne, setStyleProperty } from '#shared/dom.ts';

// The closed panel's row is as tall as its card open, which its words and figures
// change: a card still analysing is shorter than one with the player's figures, and
// left a gap over it. CSS can't read its height, so it's handed to main.analyse
// (styles/review/layout.css), whose row eases between it and the folded strip's.

let sizes: ResizeObserver | null = null;

function onResize(entries: readonly ResizeObserverEntry[]): void {
  for (const entry of entries) {
    const size = entry.borderBoxSize[0];
    const main = closestTo(entry.target, 'main.analyse', HTMLElement);
    if (main && size)
      setStyleProperty(main, '--ln-ext-review-card', `${Math.ceil(size.blockSize)}px`);
  }
}

/** Follows the height of the card `panel` holds, drawn anew on each pass. */
export function fitCardRoom(panel: HTMLElement): void {
  sizes ??= new ResizeObserver(onResize);
  sizes.disconnect();
  const card = queryOne(panel, '.ln-ext-end__top-inner > .ln-ext-end__card', HTMLElement);
  if (card) sizes.observe(card);
}
