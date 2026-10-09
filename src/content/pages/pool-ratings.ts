import { createElement, queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The quick pairing's speed headings are drawn by CSS, in each row's first
// button (styles/home/quick-pairing.css); a rating right after the name can't
// be, as the name's width isn't known there. Each of these buttons gets a span
// that sets the name again, unseen, and the rating after it. Snabbdom leaves
// alone the nodes it didn't create.

const FIRSTS =
  "main.lobby .lpool:is([data-id='1+0'], [data-id='3+0'], [data-id='10+0'], [data-id='30+0'])";

export function syncPoolRatings(): void {
  for (const pool of queryAll(document, FIRSTS, HTMLElement)) {
    if (pool.querySelector(':scope > .cdc-pool-rating')) continue;
    const rating = createElement('span', {
      className: 'cdc-pool-rating',
      attrs: { 'aria-hidden': 'true' },
    });
    rating.append(createElement('span', { className: 'cdc-pool-rating__name' }));
    pool.append(rating);
  }
}

export const poolRatings: Feature = {
  name: 'pool ratings',
  start: () => onEveryTick('pool ratings', syncPoolRatings),
};
