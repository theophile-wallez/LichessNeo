import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's rules these pages fight: its boxes' clip from 799.3px (site.css), a team page's
// own (team.css) and the box's padding variable.
const LICHESS =
  ':root { ---box-padding: 50px; } .box { overflow: hidden; } .team-show { overflow: hidden; }';

const SHEETS = [
  'pages/page-boxes.css',
  'friends.css',
  'teams.css',
  'team-menu.css',
  'team-show.css',
  'team-tournaments.css',
];

// happy-dom drops a selector over several lines, and nested rules: each run of white space
// becomes one space, and a rule nested one level (`& > a`, friends.css) a rule of its own.
const flattenNesting = (css: string): string =>
  css.replaceAll(
    /([^{}]+)\{((?:[^{}]*\{[^{}]*\})+)[^{}]*\}/gu,
    (block: string, parent: string, body: string) =>
      parent.trim().startsWith('@')
        ? block
        : body.replaceAll(
            /([^{}]+)\{([^{}]*)\}/gu,
            (__, child: string, rules: string) =>
              `${child.replaceAll('&', parent.trim())} {${rules}}`,
          ),
  );

const sheet = (name: string): string =>
  flattenNesting(readFileSync(join(import.meta.dirname, name), 'utf8').replaceAll(/\s+/gu, ' '));

/** A team page's markup under our sheets, at a window width; `has` is `data-ln-ext-has`. */
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

const TEAM =
  '<main class="team-show box"><div class="box__top"><h1>Solo Rapid League</h1></div>' +
  '<div class="team-show__content"></div></main>';

describe('a team’s page', () => {
  // `hidden` made the page a scroll container, which #main-wrap's grid row cut to the window.
  it('clips its corners without being a scroller, so the page runs its whole height', () => {
    render(TEAM);
    expect(styleOf('main').overflow).toBe('clip');
    expect(styleOf('main').minWidth).toBe('0');
  });

  it('pins its title on a desktop only', () => {
    render(TEAM);
    expect(styleOf('.box__top').position).toBe('sticky');
    document.head.innerHTML = '';
    render(TEAM, { width: 1019 });
    expect(styleOf('.box__top').position).not.toBe('sticky');
  });
});

const TOURNAMENTS =
  '<main><div class="box"><div class="box__top"><h1>Lichess Swiss • Tournaments</h1></div>' +
  '<div class="team-events team-tournaments team-tournaments--both">' +
  '<div class="team-tournaments__next"><h2>Upcoming</h2></div>' +
  '<div class="team-tournaments__past"><h2>Completed</h2></div></div></div></main>';

const EVENTS =
  '<main class="team-events page-menu" data-ln-ext-menu="teams">' +
  '<nav class="page-menu__menu subnav"></nav><div class="page-menu__content box">' +
  '<h1 class="box__top">Upcoming team events</h1>' +
  '<div class="team-events team-tournaments team-tournaments--both">' +
  '<div class="team-tournaments__next"></div></div></div></main>';

describe('a team’s tournaments page', () => {
  it('pins its title on the page, and lines the lists up with it', () => {
    render(TOURNAMENTS, { has: 'team-tournaments' });
    expect(styleOf('.box').overflow).toBe('clip');
    expect(styleOf('.box__top').position).toBe('sticky');
    expect(styleOf('.team-tournaments').paddingLeft).toBe('0px');
  });

  it('stacks the upcoming and the past lists on a phone', () => {
    render(TOURNAMENTS, { width: 390, has: 'team-tournaments' });
    expect(styleOf('.team-tournaments__next').flexBasis).toBe('100%');
    expect(styleOf('.team-tournaments__next').minWidth).toBe('0');
  });
});

describe('the team events', () => {
  it('keep the menu put and pin the title, in the page’s color as the lists do', () => {
    render(EVENTS, { has: 'team-events' });
    expect(styleOf('.page-menu__menu').position).toBe('sticky');
    expect(styleOf('h1.box__top').position).toBe('sticky');
    expect(styleOf('.page-menu__content').overflow).toBe('clip');
  });

  it('take the lists’ title size, and no margins of a page of their own', () => {
    render(EVENTS, { has: 'team-events' });
    expect(styleOf('h1.box__top').fontSize).toBe('30.4px');
    expect(styleOf('.team-tournaments').paddingLeft).not.toBe('50px');
  });
});

const playerList = (title: string): string =>
  `<main class="box page-small" data-ln-ext-list="players"><div class="box__top"><h1>${title}</h1></div>` +
  '<table class="slist"><tbody></tbody></table></main>';

describe('a list of players', () => {
  it('pins its title over the page', () => {
    render(playerList('<a href="/@/Eresy" data-icon="" class="text"></a>Friends'));
    expect(styleOf('main').overflow).toBe('clip');
    expect(styleOf('.box__top').position).toBe('sticky');
  });

  // A team's members name the team in that link: as a 36px round button, it was cut.
  // happy-dom takes a link holding only text for `:empty`, so the selectors are read.
  it('draws a round back button for an empty link only', () => {
    const backButton = sheet('friends.css')
      .split('}')
      .map(rule => rule.split('{')[0] ?? '')
      .filter(selector => selector.includes('.box__top h1 > a[data-icon]'));
    expect(backButton.length).toBeGreaterThan(0);
    for (const selector of backButton) expect(selector).toContain('a[data-icon]:empty');
  });
});
