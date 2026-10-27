import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// A recent game's card, cut to the opponent's rating and the outcome's change.
const CARD =
  '<div class="user-show"><section class="ln-ext-recent"><a class="ln-ext-recent__game">' +
  '<span class="ln-ext-recent__rating">1508</span>' +
  '<span class="ln-ext-recent__diff">+7</span></a></section></div>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
});

function displays(bodyClass: string): string[] {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'recent-games.css'), 'utf8');
  document.head.append(style);
  document.body.className = bodyClass;
  document.body.innerHTML = CARD;
  return ['.ln-ext-recent__rating', '.ln-ext-recent__diff'].map(selector => {
    const element = queryOne(document, selector, HTMLElement);
    if (!element) throw new Error(`no ${selector}`);
    return getComputedStyle(element).display;
  });
}

describe('a recent game’s card', () => {
  it('hides the ratings when Lichess’s “Show player ratings” is off', () => {
    expect(displays('')).not.toContain('none');
    expect(displays('no-rating')).toEqual(['none', 'none']);
  });
});
