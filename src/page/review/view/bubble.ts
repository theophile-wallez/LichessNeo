import { queryOne, setStyleProperty } from '#shared/dom.ts';

// The coach's bubble is centered on its tail, which stays at the coach's
// chin (review.css). CSS can't read an element's height, so it's handed
// over; it only moves the bubble, never resizes it, so it can't loop.

let sizes: ResizeObserver | null = null;

function onResize(entries: readonly ResizeObserverEntry[]): void {
  for (const entry of entries) {
    const size = entry.borderBoxSize[0];
    if (entry.target instanceof HTMLElement && size)
      setStyleProperty(entry.target, '--lr-ext-bubble-h', `${size.blockSize}px`);
  }
}

export function fitBubble(panel: HTMLElement): void {
  sizes ??= new ResizeObserver(onResize);
  sizes.disconnect();
  const bubble = queryOne(panel, '.lr-ext-bubble', HTMLElement);
  if (bubble) sizes.observe(bubble);
}
