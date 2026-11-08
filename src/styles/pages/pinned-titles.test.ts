import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's boxes clip from 799.3px (site.css); a padded box takes its padding's variable.
const LICHESS = ':root { ---box-padding: 50px; } .box { overflow: hidden; }';

const SHEETS = ['pinned-titles.css', 'features.css', 'account-pinned.css', 'streamers.css'];

// happy-dom drops a selector over several lines: each run of white space becomes one space.
const sheet = (name: string): string =>
  readFileSync(join(import.meta.dirname, name), 'utf8').replaceAll(/\s+/gu, ' ');

/** A page's markup under our sheets, at a window width; `has` is `data-ln-ext-has`. */
function render(markup: string, { width = 1366, has = '' } = {}): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = [LICHESS, ...SHEETS.map(sheet)].join('\n');
  document.head.append(style);
  document.documentElement.dataset['lnExtHas'] = has;
  document.body.innerHTML = markup;
}

function styleOf(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset['lnExtHas'];
});

// Each page, the flag it raises, and its title.
const PAGES = [
  {
    name: 'a leaderboard',
    has: 'leaderboard-top',
    markup:
      '<main class="page-small box"><div class="box__top"><h1>Blitz top</h1></div>' +
      '<table class="slist slist-leaderboard"></table></main>',
    title: '.box__top',
  },
  {
    name: 'a form beside a side menu',
    has: 'menu-form',
    markup:
      '<main class="page page-menu"><aside class="subnav"></aside>' +
      '<div class="page-menu__content box box-pad"><div class="box__top"><h1>New live broadcast</h1></div>' +
      '<form class="form3"></form></div></main>',
    title: '.box__top',
  },
  {
    name: 'the tournament form',
    has: '',
    markup:
      '<main class="page-small"><div class="tour__form box box-pad">' +
      '<h1 class="box__top">Create a new tournament</h1><form class="form3"></form></div></main>',
    title: 'h1',
  },
  {
    name: 'the mobile app’s page',
    has: '',
    markup:
      '<main><div class="mobile page-small box box-pad"><h1 class="box__top">Lichess Mobile App</h1>' +
      '<div class="sides"></div></div></main>',
    title: 'h1',
  },
  {
    name: 'a video',
    has: '',
    markup:
      '<main class="video page-menu"><aside class="page-menu__menu"></aside>' +
      '<div class="page-menu__content box"><div class="show"><div class="embed"></div>' +
      '<h1 class="box__pad">Aronian vs. Nakamura</h1></div></div></main>',
    title: 'h1',
  },
  {
    name: 'the sessions',
    has: 'account',
    markup:
      '<main class="account page-menu"><aside class="subnav"></aside>' +
      '<div class="page-menu__content"><div class="security"><div class="box">' +
      '<h1 class="box__top">Security</h1></div></div></div></main>',
    title: 'h1',
  },
];

describe('the titles pinned on Lichess’s pages', () => {
  it.each(PAGES)('pins $name’s on a desktop', ({ has, markup, title }) => {
    render(markup, { has });
    expect(styleOf(title).position).toBe('sticky');
  });

  it.each(PAGES)('leaves $name’s in place below 1020px', ({ has, markup, title }) => {
    render(markup, { width: 1019, has });
    expect(styleOf(title).position).not.toBe('sticky');
  });

  // `hidden` would catch the title, and have #main-wrap's grid cut the page to the window.
  it('clips a card without making it a scroller', () => {
    const form = PAGES[1];
    if (!form) throw new Error('no form');
    render(form.markup, { has: form.has });
    expect(styleOf('.page-menu__content').overflow).toBe('clip');
    expect(styleOf('.page-menu__content').minWidth).toBe('0');
  });
});

describe('the features page', () => {
  const FEATURES =
    '<main class="box box-pad features"><table><thead><tr><th><h1>Website</h1></th>' +
    '<th>Free account</th><th>Lichess Patron</th></tr></thead><tbody></tbody></table></main>';

  it('pins each section’s heading row, and clips its card without catching it', () => {
    render(FEATURES);
    expect(styleOf('main').overflow).toBe('clip');
    expect(styleOf('thead th').position).toBe('sticky');
  });
});

describe('a streamer’s page', () => {
  it('keeps its side put, where Lichess stretched it down the page', () => {
    render(
      '<main class="page-menu streamer-show"><aside class="page-menu__menu"></aside>' +
        '<div class="page-menu__content"></div></main>',
    );
    expect(styleOf('aside').position).toBe('sticky');
    expect(styleOf('aside').alignSelf).toBe('start');
  });
});
