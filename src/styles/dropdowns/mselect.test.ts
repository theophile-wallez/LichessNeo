import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule: the mask behind an open menu dims the page.
const LICHESS_RULE = '.fullscreen-mask { background: rgba(0, 0, 0, 0.7); }';

/** The background of an open menu's mask, put where Lichess puts it, at a window width. */
function maskBackground(markup: string, width = 1280): string {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = LICHESS_RULE + readFileSync(join(import.meta.dirname, 'mselect.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = markup;
  const mask = queryOne(document, '.fullscreen-mask', HTMLElement);
  if (!mask) throw new Error('no mask');
  return getComputedStyle(mask).backgroundColor;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('an open menu’s mask', () => {
  it('doesn’t dim the page on a desktop', () => {
    expect(maskBackground('<div class="mselect"><div class="fullscreen-mask"></div></div>')).toBe(
      'transparent',
    );
  });

  // A broadcast's rounds put it in <body>, over #main-wrap, whose stacking holds the menu.
  it('doesn’t dim it either from <body>, where it hid the menu too', () => {
    expect(maskBackground('<div class="fullscreen-mask mselect__fullscreen-mask"></div>')).toBe(
      'transparent',
    );
  });

  it('dims the page on a phone, where the menu stands over it', () => {
    expect(
      maskBackground('<div class="fullscreen-mask mselect__fullscreen-mask"></div>', 390),
    ).not.toBe('transparent');
  });
});
