import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bundleCss } from '#scripts/lib/css-bundle.ts';
import { cssRules } from '#shared/testing/stylesheets.ts';

let css = '';

beforeAll(async () => {
  css = await bundleCss(join(import.meta.dirname, 'index.css'));
});

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

const loadSheets = (lichess = ''): CSSRule[] => cssRules(lichess + css);

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

  it('makes nothing hop', () => {
    const hopping = loadSheets()
      .filter(rule => rule instanceof CSSStyleRule)
      .filter(rule => rule.selectorText.includes(':hover'))
      // happy-dom keeps the shorthand as written.
      .filter(rule =>
        ['animation', 'animation-name'].some(
          name => !['', 'none'].includes(rule.style.getPropertyValue(name)),
        ),
      )
      .map(rule => rule.selectorText);
    expect(hopping).toEqual([]);
  });
});

// Not a card's edge: form controls, the calendar's days (today's ring stays), legend
// chips that keep theirs, a chevron drawn with borders, a friend's line.
const EDGED = new Set([
  "main.importer form.import .upload input[type='file']:hover",
  'main#insight .axis-form .ms-choice:hover',
  '.flatpickr-calendar .flatpickr-day:is(:hover, :focus)',
  '.flatpickr-calendar .flatpickr-day.today:is(:hover, :focus)',
  '.flatpickr-calendar .flatpickr-day.selected, .flatpickr-calendar .flatpickr-day.selected:is(:hover, :focus)',
  '.ln-ext-dist__chip, .ln-ext-dist__chip:hover',
  '.ln-ext-ins__chip, .ln-ext-ins__chip:hover',
  'main.lobby .lobby__support-link:hover::after',
  '#friend_box .content > div:hover a.user-link .line',
]);

describe('a card under the pointer', () => {
  it('keeps its border', () => {
    const lit = loadSheets()
      .filter(rule => rule instanceof CSSStyleRule)
      .filter(rule => rule.selectorText.includes(':hover'))
      .filter(rule => rule.style.getPropertyValue('border-color') !== '')
      .map(rule => rule.selectorText.replaceAll(/\s+/g, ' '))
      .filter(selector => !EDGED.has(selector));
    expect(lit).toEqual([]);
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
