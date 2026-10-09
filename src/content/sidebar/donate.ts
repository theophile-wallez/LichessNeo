import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Donate as a sidebar item of its own (styles/sidebar/donate-and-buttons.css).
// Lichess's lone Donate link after the nav is missing for patrons and on zen
// pages, but the flyout's copy is there for everyone except kids: we copy its
// label and link.

export function addDonateItem(): void {
  const nav = document.getElementById('topnav');
  const patron = nav && queryOne(nav, 'a.community-patron', HTMLAnchorElement);
  if (!nav || !patron || document.getElementById('lr-ext-donate')) return;
  const item = createElement('a', { id: 'lr-ext-donate', text: patron.textContent.trim() });
  item.href = patron.href;
  nav.after(item);
}

export const donate: Feature = {
  name: 'donate',
  start: () => onDomReady(addDonateItem),
};
