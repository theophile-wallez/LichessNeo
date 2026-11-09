import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's rules these pages fight: its boxes' clip from 799.3px (site.css), a team page's
// own (team.css), the box's padding variable, its larger title when the h1 is the box's top, and
// a padded box's room above it.
const LICHESS =
  ':root { ---box-padding: 50px; } .box { overflow: hidden; } .team-show { overflow: hidden; }' +
  ' h1.box__top { font-size: 38px; } .box-pad { padding: 4vh var(---box-padding); }';

const SHEETS = [
  'pages/headings-menus.css',
  'pages/page-boxes.css',
  'team-show/chat.css',
  'friends.css',
  'teams.css',
  'team-menu.css',
  'team-show/layout.css',
  'team-show/head.css',
  'team-show/pinned.css',
  'team-show/actions.css',
  'team-show/sections.css',
  'team-show/members.css',
  'team-show/narrow.css',
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

const MEMBERS =
  '<main class="team-show box"><div class="box__top"><h1>Solo Rapid League</h1></div>' +
  '<section class="mchat"><div class="mchat__tabs"></div><div class="mchat__content"></div>' +
  '</section><div class="team-show__members"><div class="recent-members"><h2><a>Members</a></h2>' +
  '</div></div><div class="team-show__content"></div></main>';

describe('a team’s members', () => {
  it('stay beside the page on a desktop, their list scrolling in their own box', () => {
    render(MEMBERS);
    expect(styleOf('.team-show__members').position).toBe('sticky');
    expect(styleOf('.team-show__members').overflowY).toBe('auto');
    expect(styleOf('.recent-members h2').position).toBe('sticky');
    document.head.innerHTML = '';
    render(MEMBERS, { width: 1019 });
    expect(styleOf('.team-show__members').position).not.toBe('sticky');
  });

  // content/pages/team-show/chat-off.ts marks a chat its toggle turned off.
  it('take the room of a chat turned off, folded to its title', () => {
    render(MEMBERS);
    const halfHeight = styleOf('.team-show__members').height;
    document.body.innerHTML = MEMBERS.replace('class="mchat"', 'class="mchat" data-ln-ext-off');
    expect(styleOf('.mchat').height).toBe('46px');
    expect(styleOf('.mchat__content').display).toBe('none');
    expect(styleOf('.team-show__members').height).not.toBe(halfHeight);
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

  // A sticky top alone left it 16px higher on a page shorter than the menu.
  it('keep the menu 16px down on every page, short or long, and the scrollbar’s room', () => {
    render(EVENTS, { has: 'team-events team-menu' });
    expect(styleOf('.page-menu__menu').marginTop).toBe('16px');
    document.body.insertAdjacentHTML('afterbegin', '<div id="main-wrap"></div>');
    expect(styleOf('#main-wrap').getPropertyValue('scrollbar-gutter')).toBe('stable');
  });

  // Their h1 is the box's top, where a list's is inside it: Lichess makes the first larger.
  it('take the lists’ title size, and no margins of a page of their own', () => {
    render(EVENTS, { has: 'team-events' });
    expect(styleOf('h1.box__top').fontSize).toBe('28px');
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

const NEW_TEAM =
  '<main class="page-menu" data-ln-ext-menu="teams"><nav class="page-menu__menu subnav">' +
  '<a href="/team/me">My teams</a><a class="active" href="/team/new">New team</a></nav>' +
  '<div class="page-menu__content box box-pad"><h1 class="box__top">New team</h1>' +
  '<form></form></div></main>';

describe('a form beside the Teams menu', () => {
  it('has its title where the lists have theirs, and the same size', () => {
    render(NEW_TEAM, { has: 'menu-form team-menu' });
    expect(styleOf('.page-menu__content').paddingTop).toBe('16px');
    expect(styleOf('h1.box__top').fontSize).toBe('28px');
  });

  // A bolder link widened the menu, which is as wide as its longest, and moved the page.
  it('keeps its open link in the other links’ weight', () => {
    render(NEW_TEAM, { has: 'menu-form team-menu' });
    expect(styleOf('.subnav a.active').fontWeight).toBe(styleOf('.subnav a').fontWeight);
  });
});
