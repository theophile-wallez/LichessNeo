import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const BUTTONS =
  '<header id="top"><div class="site-buttons"><div id="clinput"><input /></div>' +
  '<button id="ln-ext-search" class="link"><svg></svg>' +
  '<span class="ln-ext-search__label">Search</span><kbd class="ln-ext-search__keys">⌘K</kbd>' +
  '</button></div></header>';

function element(selector: string): HTMLElement {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

/** The search's buttons in a shape of the sidebar (unfolded when left out), at a width. */
function buttonsAt(width: number, shape?: string): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'search.css'), 'utf8');
  document.head.replaceChildren(style);
  if (shape) document.documentElement.dataset.lnExtSidebar = shape;
  document.body.innerHTML = BUTTONS;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtSidebar;
});

describe('the sidebar’s search', () => {
  it('keeps Lichess’s box in the page, out of the pointer’s reach', () => {
    buttonsAt(1440);
    const box = getComputedStyle(element('#clinput'));
    expect([box.position, box.opacity, box.pointerEvents]).toEqual(['absolute', '0', 'none']);
  });

  it('draws a box with its label and shortcut in the sidebar', () => {
    buttonsAt(1440);
    expect(getComputedStyle(element('#ln-ext-search')).paddingLeft).toBe('8px');
    expect(getComputedStyle(element('.ln-ext-search__label')).display).toBe('block');
    expect(getComputedStyle(element('.ln-ext-search__keys')).display).toBe('block');
  });

  it('leaves the magnifier alone, centred, in the folded sidebar and the rail', () => {
    for (const shape of ['collapsed', 'collapsed rail']) {
      buttonsAt(1440, shape);
      const button = getComputedStyle(element('#ln-ext-search'));
      expect([button.justifyContent, button.paddingLeft]).toEqual(['center', '0px']);
      expect(getComputedStyle(element('.ln-ext-search__label')).display).toBe('none');
    }
  });

  it('leaves the magnifier alone in Lichess’s top bar below 1020px', () => {
    buttonsAt(1019);
    expect(getComputedStyle(element('.ln-ext-search__label')).display).toBe('none');
  });
});
