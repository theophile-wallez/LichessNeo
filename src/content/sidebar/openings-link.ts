import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { PRACTICE_LINKED, PRACTICE_URL } from '#shared/practice-page.ts';
import { message } from '#content/platform/runtime.ts';

// The extension's page of opening practice (page/review/view/openings-page.ts)
// as a link of the sidebar's Learn section, after Lichess's Practice.

const LINK = 'ln-ext-nav-openings';

export function addOpeningsLink(): void {
  const nav = document.getElementById('topnav');
  const practice = nav && queryOne(nav, "section > div a[href$='/practice']", HTMLAnchorElement);
  if (!practice || document.querySelector(`.${LINK}`)) return;
  const link = createElement('a', { className: LINK, text: message('openingTraining') });
  link.href = PRACTICE_URL;
  practice.after(link);
  // From the free board it only changes the hash: no page load closes the phone's drawer.
  link.addEventListener('click', () => {
    const toggle = document.getElementById('tn-tg');
    if (toggle instanceof HTMLInputElement) toggle.checked = false;
  });
}

export const openingsLink: Feature = {
  name: 'openings-link',
  start: () => {
    if (PRACTICE_LINKED) onDomReady(addOpeningsLink);
  },
};
