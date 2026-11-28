import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's phone layout of the controls (ui/analyse/css/_tools-mobile.scss).
const LICHESS_RULES = '.analyse__controls .fbt { margin: 3px 2px 0; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

it('keeps as much room over the jump buttons as under them below 1020px', () => {
  Reflect.set(window, 'innerWidth', 390);
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULES + readFileSync(join(import.meta.dirname, 'controls-narrow.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    '<main class="analyse"><div class="analyse__controls"><div class="jumps">' +
    '<button class="fbt"></button></div></div></main>';
  const button = queryOne(document, '.fbt', HTMLElement);
  if (!button) throw new Error('no button');
  expect(getComputedStyle(button).marginTop).toBe('0px');
  expect(getComputedStyle(button).marginLeft).toBe('2px');
});
