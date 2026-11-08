import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's clip on its boxes (site.css) and on the current games' list (tv.css).
const LICHESS = '.box { overflow: hidden; } .tv-games .page-menu__content { overflow: hidden; }';

const SHEETS = ['event-columns.css', 'event-titles.css', 'tv-games.css'];

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

// A finished arena: its title sits with the podium.
const ARENA =
  '<main class="tour"><aside class="tour__side"></aside><div class="tour__stats"></div>' +
  '<div class="tour__main"><div class="box finished"><div class="podium-wrap">' +
  '<div class="tour__main__header"><icon class="img" data-icon=""></icon><h1>Daily Arena</h1></div>' +
  '<div class="podium"></div></div><table class="slist tour__standing"></table></div></div>' +
  '<div class="chat__members"></div></main>';

const SIMUL =
  '<main class="simul"><aside class="simul__side"></aside><div class="simul__main box">' +
  '<div class="box__top"><h1>Coach simul</h1></div>' +
  '<div class="game-list now-playing"><span class="mini-game"></span></div></div>' +
  '<div class="chat__members"></div></main>';

describe('an arena’s page from 1260px', () => {
  it('scrolls its middle column in place, the side and the table staying put', () => {
    render(ARENA, { has: 'tour' });
    expect(styleOf('html').overflow).toBe('hidden');
    expect(styleOf('.tour__main').overflowY).toBe('auto');
    expect(styleOf('.tour__stats').overflowY).toBe('auto');
    expect(styleOf('.tour__side').overflowY).toBe('auto');
  });

  // The header with the podium could only stick within it: the podium lets it out.
  it('pins the title over the standings too, its card clipping without catching it', () => {
    render(ARENA, { has: 'tour' });
    expect(styleOf('.box').overflow).toBe('clip');
    expect(styleOf('.podium-wrap').display).toBe('contents');
    expect(styleOf('.tour__main__header').position).toBe('sticky');
  });

  it('scrolls as one page below 1260px', () => {
    render(ARENA, { width: 1259, has: 'tour' });
    expect(styleOf('.tour__main').overflowY).not.toBe('auto');
    expect(styleOf('.tour__main__header').position).not.toBe('sticky');
  });

  it('starts the title with the arenas’ picture, in place of Lichess’s glyph', () => {
    render(ARENA, { width: 390, has: 'tour' });
    expect(styleOf('icon.img').display).toBe('none');
    expect(styleOf('h1').display).toBe('flex');
  });
});

describe('a simul’s page from 1260px', () => {
  it('scrolls its card in place, the title pinned at its top over isolated boards', () => {
    render(SIMUL, { has: 'simul' });
    expect(styleOf('.simul__main').overflowY).toBe('auto');
    expect(styleOf('.simul__side').overflowY).toBe('auto');
    expect(styleOf('.box__top').position).toBe('sticky');
    expect(styleOf('.mini-game').isolation).toBe('isolate');
  });
});

describe('the current games', () => {
  const GAMES =
    '<main class="page-menu tv-games"><aside class="page-menu__menu"></aside>' +
    '<div class="page-menu__content now-playing"><div class="box__top ln-ext-menu-page-title">' +
    '<h1>Top Rated</h1></div><a class="mini-game"></a></div></main>';

  // Lichess's clip caught the pinned title; without it, the grid's columns ran past the window.
  it('lets the title stick, the grid as narrow as the page leaves it', () => {
    render(GAMES);
    expect(styleOf('.now-playing').overflow).toBe('visible');
    expect(styleOf('.now-playing').minWidth).toBe('0');
    expect(styleOf('.ln-ext-menu-page-title').position).toBe('sticky');
    expect(styleOf('.mini-game').isolation).toBe('isolate');
  });
});
