import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The grid's own `display: grid` (settings-coach.css) beats the browser's rule for [hidden],
// so the card needs its own: without it the tiles stayed out while the home followed the coach.

const CARD =
  '<section class="ln-ext-coach-pick ln-ext-home-coach">' +
  '<div class="ln-ext-coach-pick__grid ln-ext-home-coach__grid" hidden></div></section>';

const sheet = (name: string): string => readFileSync(join(import.meta.dirname, name), 'utf8');

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the home coach card’s tiles', () => {
  it('are gone while it follows the coach, and a grid once it has its own', () => {
    const style = document.createElement('style');
    style.textContent = sheet('settings-coach.css') + sheet('settings-home-coach.css');
    document.head.append(style);
    document.body.innerHTML = CARD;
    const grid = queryOne(document, '.ln-ext-home-coach__grid', HTMLElement);
    if (!grid) throw new Error('no grid');
    expect(getComputedStyle(grid).display).toBe('none');
    grid.hidden = false;
    expect(getComputedStyle(grid).display).toBe('grid');
  });
});
