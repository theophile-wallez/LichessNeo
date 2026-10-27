import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { syncRecentGames } from './index.ts';

// A profile as Lichess serves it, cut to what the section reads: on its activity, or its games.
const PROFILE = (content: string): string => `<main class="page-menu"><div class="user-show">
  <div class="box__top user-show__header"><h1 class="user-link"><span class="user-link" data-href="/@/Eresy">Eresy</span></h1></div>
  <div id="us_profile"></div>
  <div class="angles number-menu number-menu--tabs">
    <a data-tab="activity" class="nm-item to-activity active" href="/@/Eresy">Activity</a>
    <a data-tab="games" class="nm-item to-games" href="/@/Eresy/all">331 games</a>
  </div>
  <div class="angle-content">${content}</div>
</div></main>`;

const ACTIVITY = '<div class="activity"></div>';

const GAME = JSON.stringify({
  id: 'aDN8u0zd',
  speed: 'bullet',
  lastMoveAt: Date.now(),
  status: 'resign',
  players: {
    white: { user: { name: 'Chlodowech', id: 'chlodowech' }, rating: 1508 },
    black: { user: { name: 'Eresy', id: 'eresy' }, rating: 1429, ratingDiff: 7 },
  },
  winner: 'black',
  lastFen: '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1',
});

let fetches: string[];
let answer: string;

beforeEach(() => {
  fetches = [];
  answer = `${GAME}\n${GAME}\n`;
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    return Promise.resolve(new Response(answer));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

async function openProfile(content: string): Promise<void> {
  document.body.innerHTML = PROFILE(content);
  syncRecentGames();
  syncRecentGames();
  await flush();
}

const section = (): HTMLElement | null => queryOne(document, '.ln-ext-recent', HTMLElement);

describe('the recent games', () => {
  it('go right over the tabs, from the profile’s user’s export, asked once', async () => {
    await openProfile(ACTIVITY);
    expect(fetches).toHaveLength(1);
    expect(fetches[0]).toMatch(/^\/api\/games\/user\/Eresy\?max=10&.*lastFen=true/);
    expect(section()?.nextElementSibling?.classList.contains('angles')).toBe(true);
    expect(queryAll(document, '.ln-ext-recent__game', HTMLElement)).toHaveLength(2);
  });

  it('stay off the games tab, which lists them already', async () => {
    await openProfile('<div id="games" class="number-menu"></div>');
    expect(fetches).toEqual([]);
    expect(section()).toBeNull();
  });

  it('show nothing for a player with no game, or when Lichess doesn’t answer', async () => {
    answer = '';
    await openProfile(ACTIVITY);
    expect(section()).toBeNull();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    await openProfile(ACTIVITY);
    expect(section()).toBeNull();
  });

  it('open the games tab in place on “See all”, and scroll down to it', async () => {
    await openProfile(ACTIVITY);
    const tabs = queryOne(document, '.angles', HTMLElement);
    const tab = queryOne(document, '.angles .to-games', HTMLAnchorElement);
    const all = queryOne(document, '.ln-ext-recent__all', HTMLAnchorElement);
    if (!tabs || !tab || !all) throw new Error('no tabs');
    const clicked = vi.fn<(event: Event) => void>(event => event.preventDefault());
    tab.addEventListener('click', clicked);
    const scrolled = vi.fn<(options?: ScrollIntoViewOptions | boolean) => void>();
    tabs.scrollIntoView = scrolled;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    all.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(clicked).toHaveBeenCalledOnce();
    expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
