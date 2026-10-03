import type { Feature } from '#shared/features.ts';

// On desktop the document never scrolls: #main-wrap does, inside its box
// (styles/sidebar/layout.css). Lichess's endless lists (bits.infiniteScroll)
// load their next page on the window's scroll, so the box's is passed on.

export function relayMainScroll(event: Event): void {
  if (event.target instanceof HTMLElement && event.target.id === 'main-wrap') {
    window.dispatchEvent(new Event('scroll'));
  }
}

export const mainScroll: Feature = {
  name: 'main-scroll',
  // An element's scroll doesn't bubble: catch it on the way down.
  start: () =>
    document.addEventListener('scroll', relayMainScroll, { capture: true, passive: true }),
};
