import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const CARD =
  '<div id="ln-ext-review"><div class="ln-ext-sum-players"><div class="ln-ext-sum-player">' +
  '<span class="ln-ext-sum-player__elo">Played like <b>1850</b></span></div></div></div>';

function eloDisplay(bodyClass: string, shown = true): string {
  if (shown) document.documentElement.dataset.lnExtReviewRating = '';
  else delete document.documentElement.dataset.lnExtReviewRating;
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'summary-players.css'), 'utf8');
  document.head.replaceChildren(style);
  document.body.className = bodyClass;
  document.body.innerHTML = CARD;
  const elo = queryOne(document, '.ln-ext-sum-player__elo', HTMLElement);
  if (!elo) throw new Error('no elo');
  return getComputedStyle(elo).display;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  document.body.className = '';
  delete document.documentElement.dataset.lnExtReviewRating;
});

describe('the summary’s players', () => {
  it('leave out the rating the game was played at with Lichess’s ratings hidden', () => {
    expect(eloDisplay('')).not.toBe('none');
    expect(eloDisplay('no-rating')).toBe('none');
  });

  it('leave it out unless the settings show it', () => {
    expect(eloDisplay('', false)).toBe('none');
  });
});
