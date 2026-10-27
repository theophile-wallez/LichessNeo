import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';

// The hover card's rows of ours (content/player-card/view.ts), as they stand once loaded.
const CARD =
  '<div id="powerTip"><div class="upt__info"></div><section class="ln-ext-upt">' +
  '<div class="ln-ext-upt__meta"><span>Paris</span></div>' +
  '<a class="ln-ext-upt__headline" href="/@/someone/perf/blitz"><span class="ln-ext-upt__rating">2100</span></a>' +
  '<div class="ln-ext-upt__facts"><span>#120</span></div>' +
  '<div class="ln-ext-upt__form"><a class="ln-ext-upt__dot" data-ln-ext-result="win"></a></div>' +
  '<a class="ln-ext-upt__best" href="/abcdefgh">Beat someone (2300)</a></section></div>';

/** The rows shown, by class. */
function shownRows(bodyClass: string): string[] {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'stats.css'), 'utf8');
  document.head.replaceChildren(style);
  document.body.className = bodyClass;
  document.body.innerHTML = CARD;
  return queryAll(document, '.ln-ext-upt > *', HTMLElement)
    .filter(row => getComputedStyle(row).display !== 'none')
    .map(row => row.className);
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the hover card’s rows', () => {
  it('drop those that tell ratings where Lichess hides its own chips', () => {
    expect(shownRows('')).toHaveLength(5);
    expect(shownRows('no-rating')).toEqual(['ln-ext-upt__meta', 'ln-ext-upt__form']);
  });
});
