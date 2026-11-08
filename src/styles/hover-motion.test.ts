import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bundleCss } from '#scripts/lib/css-bundle.ts';

let css = '';

beforeAll(async () => {
  css = await bundleCss(join(import.meta.dirname, 'index.css'));
});

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

function loadSheets(lichess = ''): CSSRule[] {
  const style = document.createElement('style');
  style.textContent = lichess + css;
  document.head.append(style);
  return style.sheet ? allRules(style.sheet.cssRules) : [];
}

function allRules(rules: CSSRuleList): CSSRule[] {
  const found: CSSRule[] = [];
  for (const rule of rules) {
    found.push(rule);
    if (rule instanceof CSSGroupingRule) found.push(...allRules(rule.cssRules));
  }
  return found;
}

// What turns for real: a chevron drawn as a box's two borders, nudged on hover.
const TURNING = new Set(['main.lobby .lobby__support-link:hover::after']);

const tilts = (rule: CSSStyleRule): boolean =>
  rule.style.getPropertyValue('transform').includes('rotate(') ||
  !['', '0', '0deg', 'none'].includes(rule.style.getPropertyValue('rotate'));

describe('hovering', () => {
  it('turns no tile, icon or picture', () => {
    const tilting = loadSheets()
      .filter(rule => rule instanceof CSSStyleRule)
      .filter(rule => /:hover|aria-selected/.test(rule.selectorText) && tilts(rule))
      .filter(rule => !TURNING.has(rule.selectorText))
      .map(rule => rule.selectorText);
    expect(tilting).toEqual([]);
  });
});

// The items of a list, in the markup Lichess serves. The user menu's rows are left out:
// happy-dom doesn't match their `:is()` of descendant selectors.
const LIST_ITEMS = {
  'a side menu’s link':
    '<main class="page-menu"><nav class="subnav"><a href="/a">A</a></nav></main>',
  'the sidebar’s link':
    '<header id="top"><nav id="topnav"><section><a href="/">Play</a></section></nav></header>',
  'the sidebar’s sub-link':
    '<header id="top"><nav id="topnav"><section><a href="/">Play</a><div role="group"><a href="/tv">TV</a></div></section></nav></header>',
  'a notification':
    '<header id="top"><div id="notify-app"><div class="site_notification">Hi</div></div></header>',
  'a picker’s item':
    '<div class="mselect"><input type="checkbox" class="mselect__toggle"><label class="mselect__label">A</label><div class="mselect__list"><span class="mselect__item">B</span></div></div>',
  'the analysis menu’s item': '<div id="analyse-cm"><a data-icon="">Delete</a></div>',
};

describe('a list item under the pointer', () => {
  it.each(Object.entries(LIST_ITEMS))('changes its background at once: %s', (_, markup) => {
    // Lichess fades some of them itself.
    loadSheets('a, div, span { transition: background-color 0.3s, color 0.3s; }');
    document.body.innerHTML = markup;
    const items = [...document.body.querySelectorAll('a, .site_notification, .mselect__item')];
    const item = items.at(-1);
    if (!(item instanceof HTMLElement)) throw new Error('no item');
    expect(getComputedStyle(item).transition).not.toMatch(/background|color|all/);
  });
});
