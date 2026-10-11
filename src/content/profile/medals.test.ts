import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { syncMedals } from './medals.ts';

// A profile as Lichess serves it, cut to what the medals read, and its user's API answer.
const PROFILE = (name: string): string => `<main class="page-menu"><div class="user-show">
  <div class="box__top user-show__header"><h1 class="user-link"><span class="user-link" data-href="/@/${name}">${name}</span></h1></div>
  <div id="us_profile"><div class="profile-side"><div class="user-infos"></div></div></div>
  <div class="angles"></div>
</div></main>`;

const ANSWER = {
  username: 'Eresy',
  createdAt: Date.UTC(2019, 4, 4),
  count: { all: 237, win: 120 },
  playTime: { total: 4 * 3600 },
  perfs: { rapid: { games: 78, rating: 1673 }, puzzle: { games: 40, rating: 2202 } },
};

let fetches: string[];

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fetches = [];
  vi.stubGlobal('chrome', { i18n: { getMessage } });
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    return Promise.resolve(new Response(JSON.stringify(ANSWER)));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

const shown = (): string[] =>
  queryAll(document, '.lr-ext-medal', HTMLElement).map(
    medal => `${medal.dataset.lrExtMedal}:${medal.dataset.lrExtMetal}`,
  );

const fresh = (): string[] =>
  queryAll(document, '.lr-ext-medal[data-lr-ext-new]', HTMLElement).map(
    medal => medal.dataset.lrExtMedal ?? '',
  );

async function openProfile(name: string): Promise<void> {
  document.body.innerHTML = PROFILE(name);
  syncMedals();
  await flush();
}

describe('the medals', () => {
  it('go right under the chart and its about card, asked once for the profile’s user', async () => {
    await openProfile('Eresy');
    syncMedals();
    await flush();
    expect(fetches).toEqual(['/api/user/eresy']);
    const section = document.querySelector('#us_profile + section.lr-ext-medals');
    expect(section?.nextElementSibling?.className).toBe('angles');
    expect(shown()).toEqual([
      'veteran:gold',
      'peak:bronze',
      'wins:bronze',
      'games:bronze',
      'puzzles:none',
      'marathon:none',
      'storm:none',
      'streak:none',
      'variants:none',
    ]);
  });

  it('give their count against the next step, and the metal in their tooltip', async () => {
    await openProfile('Eresy');
    const games = document.querySelector<HTMLElement>("[data-lr-ext-medal='games']");
    expect(games?.querySelector('.lr-ext-medal__count')?.textContent).toBe('237 / 1,000');
    expect(games?.dataset.lrExtTip).toBe('medalGames · medalBronze · medalNext:1,000');
  });

  it('show nothing when Lichess can’t say', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('Not found', { status: 404 })));
    await openProfile('closed');
    expect(document.querySelector('.lr-ext-medals')).toBeNull();
  });
});

describe('on the player’s own profile', () => {
  beforeEach(() => {
    document.body.dataset.user = 'eresy';
  });

  it('mark none new the first time, only remember them', async () => {
    await openProfile('Eresy');
    expect(fresh()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('lr-ext-medals-seen') ?? 'null')).toEqual({
      user: 'eresy',
      metals: { veteran: 'gold', games: 'bronze', wins: 'bronze', peak: 'bronze' },
    });
  });

  it('mark new the ones won, or won in a better metal, since last time', async () => {
    const seen = { user: 'eresy', metals: { veteran: 'silver', games: 'bronze' } };
    localStorage.setItem('lr-ext-medals-seen', JSON.stringify(seen));
    await openProfile('Eresy');
    expect(fresh()).toEqual(['veteran', 'peak', 'wins']);
  });

  it('leave another player’s medals alone', async () => {
    localStorage.setItem('lr-ext-medals-seen', JSON.stringify({ user: 'eresy', metals: {} }));
    await openProfile('DrNykterstein');
    expect(fresh()).toEqual([]);
  });
});
