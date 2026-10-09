import { isParsing, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Facts some rules would otherwise read with a `:has()`, copied onto the element
// as a data attribute. A `:has()` holding an attribute selector, a `:not()` or
// `*` puts Chrome on a slow path for every insertion, and each move restyled
// most of the page. The marks are set as the page parses, before it's first
// drawn, then on every tick.

interface Mark {
  readonly selector: string;
  readonly key: string;
  readonly read: (element: Element) => string | null | undefined;
}

// Each side menu (styles/pages/headings-menus.css), told apart by a link only it has.
const NAV_LINKS: Readonly<Record<string, readonly string[]>> = {
  bots: ['/player/bots'],
  broadcast: ['/broadcast/calendar'],
  puzzles: ['/training/themes'],
  account: ['/account/kid'],
  about: ['/thanks'],
  variants: ['/variant/chess960'],
  streamers: ['/streamer/edit'],
  studies: ['/study/staff-picks'],
  teams: ['/team/all'],
  blog: ['/blog/monthly'],
  'arena-history': ['/tournament/history/hourly'],
};

const hrefIn = (element: Element, selector: string): string | null | undefined =>
  element.querySelector(selector)?.getAttribute('href');

const iconIn = (element: Element, selector: string): string | undefined =>
  queryOne(element, selector, HTMLElement)?.dataset.icon;

const navsOf = (menu: Element): string =>
  Object.entries(NAV_LINKS)
    .filter(([, ends]) => ends.some(end => menu.querySelector(`a[href$='${end}']`)))
    .map(([nav]) => nav)
    .join(' ');

const PLAYER_ROWS =
  ':scope > table.slist-invert > tbody > tr > td:first-child > .user-link, ' +
  ':scope > table.slist-invert > tbody > tr:only-child > td:only-child';

const MARKS: readonly Mark[] = [
  // Which side menu, and which of its pages this is (its active link).
  { selector: '.subnav', key: 'lrExtNav', read: navsOf },
  {
    selector: 'main.page-menu',
    key: 'lrExtNavActive',
    read: main => hrefIn(main, '.subnav a.active'),
  },
  // Which side menu the page has, for its title's tile (styles/pages/static-pages.css).
  {
    selector: 'main.page-menu',
    key: 'lrExtMenu',
    read: main => {
      const menu = main.querySelector(':scope > .subnav');
      return menu ? navsOf(menu) : null;
    },
  },
  // A game's mode, by its info's icon (styles/game/game-info.css).
  {
    selector: 'main.round .game__meta',
    key: 'lrExtIcon',
    read: meta => iconIn(meta, '.game__meta__infos'),
  },
  // A rating's stats page: its title takes the glyph of its card in the menu (styles/profile/).
  {
    selector: 'main.page-menu > .perf-stat > .box__top h1',
    key: 'lrExtIcon',
    read: title => {
      const main = title.closest('main');
      return main ? iconIn(main, ':scope > .page-menu__menu a.active') : null;
    },
  },
  // A leaderboard by its title's icon, a shield by its title's link (styles/leaderboard/).
  {
    selector: '.community .user-top, .tournament-leaderboards__item',
    key: 'lrExtIcon',
    read: board => iconIn(board, ':scope > h2'),
  },
  {
    selector: '.tournament-shields__item',
    key: 'lrExtHref',
    read: shield => hrefIn(shield, ':scope > h2 > a'),
  },
  // A forum category (styles/forum/): the index links to it, a category page to
  // its topics, a topic back to it, and so does a team's board.
  { selector: 'main.forum .categs tr', key: 'lrExtHref', read: row => hrefIn(row, 'h2 a') },
  { selector: 'main.forum-categ', key: 'lrExtHref', read: main => hrefIn(main, 'td.subject a') },
  {
    selector: 'main.forum:is(.forum-categ, .forum-topic)',
    key: 'lrExtBack',
    read: main => hrefIn(main, '.box__top h1 > a'),
  },
  // The forum's search results, by where the search form goes (styles/forum/).
  {
    selector: 'main.search',
    key: 'lrExtSearch',
    read: main => main.querySelector(':scope > .box__top form.search')?.getAttribute('action'),
  },
  // A list of players (styles/friends.css): a user link first on each row, or one
  // row of one cell when it's empty.
  {
    selector: 'main.box.page-small',
    key: 'lrExtList',
    read: main => (main.querySelector(PLAYER_ROWS) ? 'players' : null),
  },
];

export function syncMarks(): void {
  for (const { selector, key, read } of MARKS) {
    for (const element of queryAll(document, selector, HTMLElement))
      setData(element, key, nonEmpty(read(element)) ?? null);
  }
}

function markWhileParsing(): void {
  // Each chunk the parser adds is a mutation: mark once a frame, still before it's drawn.
  const parsing = new MutationObserver(oncePerFrame(syncMarks));
  parsing.observe(document, { childList: true, subtree: true });
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      parsing.disconnect();
      syncMarks();
    },
    { once: true },
  );
}

export const marks: Feature = {
  name: 'marks',
  start: () => {
    if (isParsing()) markWhileParsing();
    else syncMarks();
    onEveryTick('marks', syncMarks);
  },
};
