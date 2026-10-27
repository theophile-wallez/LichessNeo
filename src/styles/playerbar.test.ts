import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Our analysis bar, filled as content/analysis/player-bar.ts fills it.
const BAR =
  '<main class="analyse"><div class="ln-ext-player ln-ext-player--top">' +
  '<a class="user-link" href="/@/someone">someone</a><rating>1834</rating></div></main>';

function ratingDisplay(bodyClass: string): string {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'playerbar.css'), 'utf8');
  document.head.replaceChildren(style);
  document.body.className = bodyClass;
  document.body.innerHTML = BAR;
  const rating = queryOne(document, 'rating', HTMLElement);
  if (!rating) throw new Error('no rating');
  return getComputedStyle(rating).display;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the player bars', () => {
  // Lichess's own rule hides the ratings of its bars only (ui/round/css/_user.scss).
  it('hide our bars’ ratings where Lichess hides its own', () => {
    expect(ratingDisplay('coords-in')).not.toBe('none');
    expect(ratingDisplay('coords-in no-rating')).toBe('none');
  });
});
