import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chesscomRating, chesscomRatingChange } from '#shared/chesscom-rating/convert.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { playerCard, syncPlayerCard } from './index.ts';

const settings = vi.hoisted(() => ({ chesscomRating: false }));
vi.mock('#content/settings/settings.ts', () => ({ currentSettings: () => settings }));

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 22, 12);

// How long the pointer must stay on a name before the details are asked for.
const DETAILS_DELAY_MS = 400;

// The card Lichess builds from /@/<user>/mini, cut to what our rows read.
const CARD = (name: string, { online = true } = {}): string =>
  `<div class="upt__info">
    <div class="upt__info__top"><a class="user-link${online ? ' online' : ''}" href="/@/${name}">${name}</a></div>
    <div class="upt__info__ratings"><span>2410</span></div>
  </div>
  <div class="upt__actions btn-rack"></div>`;

// Lichess sends every rating with the player, puzzles included.
const USER = {
  perfs: {
    bullet: { games: 420, rating: 2180 },
    blitz: { games: 1200, rating: 2410, prog: 23 },
    puzzle: { games: 900, rating: 2600 },
  },
  seenAt: NOW - 3 * HOUR,
  playTime: { total: 18 * 3600 },
  count: { win: 600, loss: 400, draw: 200 },
  profile: { fideRating: 2300, location: 'Lyon' },
};

const HISTORY = [
  {
    name: 'Blitz',
    points: [
      [2026, 9, 19, 2380],
      [2026, 9, 20, 2395],
    ],
  },
];

const PERF = {
  rank: 812,
  percentile: 99.2,
  stat: {
    highest: { int: 2450 },
    bestWins: { results: [{ opRating: 2600, opId: { name: 'Magnus' }, gameId: 'best1234' }] },
    count: { opAvg: 2360 },
    resultStreak: { win: { cur: { v: 4 } } },
  },
};

const sides = (name: string) => ({
  white: { user: { id: name } },
  black: { user: { id: 'rival' } },
});

/** Their last games as the export sends them, one a line, the newest first. */
const gamesOf = (name: string): string =>
  [
    { id: 'live1234', status: 'started', players: sides(name) },
    { id: 'won12345', status: 'mate', winner: 'white', players: sides(name) },
    { id: 'lost1234', status: 'resign', winner: 'black', players: sides(name) },
    { id: 'drew1234', status: 'draw', players: sides(name) },
  ]
    .map(game => JSON.stringify(game))
    .join('\n');

let fetches: string[];

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

const answer = (url: string): Response => {
  const name = /\/api\/(?:games\/)?user\/([\w-]+)/.exec(url)?.[1] ?? '';
  if (url.includes('/rating-history')) return Response.json(HISTORY);
  if (url.includes('/perf/')) return Response.json(PERF);
  if (url.startsWith('/api/games/user/')) return new Response(gamesOf(name));
  return name === 'closed' ? new Response('', { status: 404 }) : Response.json(USER);
};

beforeAll(() => playerCard.start());

beforeEach(() => {
  fetches = [];
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal('chrome', { i18n: { getMessage } });
  vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    return Promise.resolve(answer(url));
  });
});

afterEach(() => {
  settings.chesscomRating = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

/** A hover on a name, waited out until what Lichess has already said has landed. */
async function hover(name: string, shape?: { online?: boolean }): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.id = 'powerTip';
  card.innerHTML = CARD(name, shape);
  document.body.append(card);
  syncPlayerCard(card);
  await vi.advanceTimersByTimeAsync(0);
  return card;
}

const texts = (card: HTMLElement, selector: string): string[] =>
  queryAll(card, selector, HTMLElement).map(item => item.textContent?.trim() ?? '');

const dots = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, '.ln-ext-upt__dot', HTMLAnchorElement).map(dot => dot.dataset.lnExtResult);

describe('the hovered player’s own rows', () => {
  it('say who they are and the rating they play most, from their profile alone', async () => {
    const card = await hover('cardone', { online: false });
    expect(fetches).toEqual(['/api/user/cardone']);
    const meta = texts(card, '.ln-ext-upt__meta > span');
    expect(meta).toEqual([
      'cardFide:2300',
      'Lyon',
      expect.stringMatching(/3/),
      'cardPlayedHours:18',
    ]);
    expect(texts(card, '.ln-ext-upt__headline > *')).toEqual(['speedBlitz', '2410', '+23', '']);
    // The curve waits for the history, the record doesn't: it comes with the profile.
    expect(queryOne(card, '.ln-ext-upt__curve--empty', HTMLElement)).not.toBeNull();
    expect(texts(card, '.ln-ext-upt__legend > span')).toEqual([
      'cardWinShare:50',
      'cardDrawShare:17',
      'cardLossShare:33',
    ]);
  });

  it('say nothing of when they were last seen while Lichess shows them online', async () => {
    const card = await hover('cardtwo');
    expect(texts(card, '.ln-ext-upt__meta > span')).toEqual([
      'cardFide:2300',
      'Lyon',
      'cardPlayedHours:18',
    ]);
  });

  it('ask for the rest once the pointer has stayed, and put each answer in', async () => {
    const card = await hover('cardthree');
    await vi.advanceTimersByTimeAsync(DETAILS_DELAY_MS);
    expect(fetches).toEqual([
      '/api/user/cardthree',
      '/api/user/cardthree/rating-history',
      '/api/user/cardthree/perf/blitz',
      '/api/games/user/cardthree?max=6&moves=false&tags=false&opening=false&lastFen=false',
    ]);
    expect(queryOne(card, 'svg.ln-ext-upt__curve', SVGElement)).not.toBeNull();
    expect(texts(card, '.ln-ext-upt__facts > span')).toEqual([
      '#812',
      'cardTop:0.8',
      'cardHighest:2450',
      'cardOpponents:2360',
    ]);
    // The game being played costs no dot, hence the sixth game asked for.
    expect(dots(card)).toEqual(['win', 'loss', 'draw']);
    expect(texts(card, '.ln-ext-upt__streak')).toEqual(['cardStreak:4']);
    expect(queryOne(card, '.ln-ext-upt__best', HTMLAnchorElement)?.getAttribute('href')).toBe(
      '/best1234',
    );
  });

  it('ask nothing more of a name the pointer only passed over', async () => {
    await hover('cardfour');
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'hidden' }));
    await vi.advanceTimersByTimeAsync(DETAILS_DELAY_MS);
    expect(fetches).toEqual(['/api/user/cardfour']);
  });

  it('are none for a player Lichess can’t answer for, and asked again later', async () => {
    const card = await hover('closed');
    expect(queryOne(card, '.ln-ext-upt', HTMLElement)).toBeNull();
    await hover('closed');
    expect(fetches).toEqual(['/api/user/closed', '/api/user/closed']);
  });

  it('are none for a game with no account behind it, nothing asked at all', async () => {
    const card = document.createElement('div');
    card.innerHTML = CARD('anon').replace('/@/anon', '/');
    syncPlayerCard(card);
    await vi.advanceTimersByTimeAsync(DETAILS_DELAY_MS);
    expect(fetches).toEqual([]);
    expect(queryOne(card, '.ln-ext-upt', HTMLElement)).toBeNull();
  });
});

describe('a card with the Chess.com ratings on', () => {
  it('converts the headline’s progress as the gap between its two ratings, Lichess’s in its tooltip', async () => {
    settings.chesscomRating = true;
    const card = await hover('cardchess');
    const rating = queryOne(card, '.ln-ext-upt__rating', HTMLElement);
    const progress = queryOne(card, '.ln-ext-upt__prog', HTMLElement);
    const change = chesscomRatingChange('blitz', { before: 2387, after: 2410 }) ?? 0;
    expect(rating?.textContent).toBe(String(chesscomRating('blitz', 2410)?.rating));
    expect(progress?.textContent).toBe(`+${change}`);
    expect(change).not.toBe(23);
    expect(progress?.dataset.lnExtTip).toBe('lichessRatingTip:+23');
  });
});

describe('a signed-in visitor', () => {
  // Lichess's own fragment ends with their score against the player
  // (.upt__score), so ours asks for no crosstable of its own.
  it('is asked nothing more than a visitor signed out', async () => {
    document.body.dataset.user = 'visitor';
    await hover('cardfive');
    await vi.advanceTimersByTimeAsync(DETAILS_DELAY_MS);
    expect(fetches.filter(url => url.includes('crosstable'))).toEqual([]);
    expect(fetches).toHaveLength(4);
  });
});

describe('a card Lichess draws again', () => {
  it('gets its rows back, written only once: our own write wakes its observer', async () => {
    const card = await hover('cardseven');
    await vi.advanceTimersByTimeAsync(DETAILS_DELAY_MS);
    const observer = new MutationObserver(() => {});
    observer.observe(card, { childList: true, subtree: true });
    syncPlayerCard(card);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
    expect(dots(card)).toEqual(['win', 'loss', 'draw']);
  });
});

// Last: the hold it leaves outlasts the test, as it does a rate-limited tab.
describe('a Lichess that rate-limits us', () => {
  it('holds every other request back', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      fetches.push(url);
      return Promise.resolve(new Response('', { status: 429 }));
    });
    await hover('cardeight');
    expect(fetches).toEqual(['/api/user/cardeight']);
    await hover('cardnine');
    expect(fetches).toEqual(['/api/user/cardeight']);
  });
});
