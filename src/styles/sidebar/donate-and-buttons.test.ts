import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (ui/lib/css/header/_header.scss): the magnifier's 3px padding.
const LICHESS_RULE = '#clinput .link { padding: 0 3px; }';

const SEARCH =
  '<header id="top"><div class="site-buttons"><div id="clinput">' +
  '<a class="link"><span data-icon=""></span></a><input spellcheck="false">' +
  '</div></div></header>';

// happy-dom computes no `padding-inline`: the last rule that matches says what it is.
function declared(element: Element, rules: CSSRuleList, property: string): string {
  let value = '';
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule && window.matchMedia(rule.conditionText).matches)
      value = declared(element, rule.cssRules, property) || value;
    if (rule instanceof CSSStyleRule && element.matches(rule.selectorText))
      value = rule.style.getPropertyValue(property) || value;
  }
  return value;
}

/** The magnifier's inline padding, in a shape of the sidebar (expanded when left out). */
function magnifier(shape?: string): string {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', 1440);
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULE + readFileSync(join(import.meta.dirname, 'donate-and-buttons.css'), 'utf8');
  document.head.replaceChildren(style);
  if (shape) document.documentElement.dataset.lnExtSidebar = shape;
  document.body.innerHTML = SEARCH;
  const link = queryOne(document, '#clinput .link', HTMLElement);
  if (!link || !style.sheet) throw new Error('no magnifier');
  return declared(link, style.sheet.cssRules, 'padding-inline');
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtSidebar;
});

describe('the sidebar’s search', () => {
  it('sets its magnifier as far in as the links’ icons above it', () => {
    expect(magnifier().split(' ')[0]).toBe('8px');
  });

  it('leaves the magnifier centred alone in the folded sidebar', () => {
    // Lichess's own even padding, untouched.
    expect(magnifier('collapsed')).toBe('');
  });

  it('leaves it centred in the rail too, folded for good', () => {
    expect(magnifier('collapsed rail')).toBe('');
  });
});
