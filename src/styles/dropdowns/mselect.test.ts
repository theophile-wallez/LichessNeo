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

// Our layout's own stacking: #main-wrap's, for the clock faces, and a pinned title's.
const LAYOUT_RULES =
  '#main-wrap { isolation: isolate; } .box__top { position: sticky; z-index: 107; }';

/** A property of the element `selector` finds in `markup`, our layout and this sheet applied. */
function styleOf(markup: string, selector: string, property: string): string {
  Reflect.set(window, 'innerWidth', 1280);
  const style = document.createElement('style');
  style.textContent = LAYOUT_RULES + readFileSync(join(import.meta.dirname, 'mselect.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = markup;
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).getPropertyValue(property);
}

// The mask stands at z-index 110 and the menu at 111, but a stacking context round the menu
// left it under the mask, which caught every click meant for it.
describe('an open menu', () => {
  afterEach(() => {
    delete document.documentElement.dataset['lnExtHas'];
  });

  it('leaves #main-wrap’s stacking while the mask points at it', () => {
    document.documentElement.dataset['lnExtHas'] = 'relay-tour menu-mask';
    expect(styleOf('<div id="main-wrap"></div>', '#main-wrap', 'isolation')).toBe('auto');
  });

  it('keeps #main-wrap’s stacking once closed', () => {
    document.documentElement.dataset['lnExtHas'] = 'relay-tour';
    expect(styleOf('<div id="main-wrap"></div>', '#main-wrap', 'isolation')).toBe('isolate');
  });

  it.each([
    ['open', ' checked', '111'],
    ['closed', '', '107'],
  ])('lifts the pinned title holding it while %s', (_state, checked, zIndex) => {
    const markup = `<div class="box__top"><div class="mselect"><input class="mselect__toggle" type="checkbox"${checked}></div></div>`;
    expect(styleOf(markup, '.box__top', 'z-index')).toBe(zIndex);
  });
});
