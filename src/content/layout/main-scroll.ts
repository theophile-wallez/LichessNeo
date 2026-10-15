import type { Feature } from '#shared/features.ts';

// On desktop the document never scrolls: #main-wrap does, inside its box
// (styles/sidebar/layout.css). Lichess's endless lists (bits.infiniteScroll)
// load their next page on the window's scroll, so the box's is passed on.
// `overflow: hidden` still lets a link's anchor scroll the document, by the
// little Lichess's hidden hover cards leave past its end, pushing the whole
// page and its pinned title up: it's put back.

const desktop = window.matchMedia('(min-width: 1020px)');

export function relayMainScroll(event: Event): void {
  if (event.target instanceof HTMLElement && event.target.id === 'main-wrap') {
    window.dispatchEvent(new Event('scroll'));
  } else if (event.target === document && desktop.matches && window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
}

export const mainScroll: Feature = {
  name: 'main-scroll',
  // An element's scroll doesn't bubble: catch it on the way down.
  start: () =>
    document.addEventListener('scroll', relayMainScroll, { capture: true, passive: true }),
};
