import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { syncHomeGames } from './index.ts';

// The home as Lichess serves it, cut to what the section reads.
const LOBBY = (signedIn: boolean): string =>
  `<header id="top">${signedIn ? '<a id="user_tag">Eresy</a>' : ''}</header>
  <main class="lobby"><div class="lobby__puzzle"></div><div class="lobby__feed"></div></main>`;

const game = (id: string, speed: string): string =>
  JSON.stringify({
    id,
    speed,
    lastMoveAt: Date.now(),
    status: 'resign',
    players: {
      white: { user: { name: 'Eresy', id: 'eresy' }, rating: 1429, ratingDiff: 7 },
      black: { user: { name: 'Chlodowech', id: 'chlodowech' }, rating: 1508 },
    },
    winner: 'white',
    lastFen: '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1',
  });

let fetches: string[];
let answer: string;

beforeEach(() => {
  fetches = [];
  answer = [game('a1', 'blitz'), game('b2', 'rapid'), game('c3', 'blitz')].join('\n');
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    return Promise.resolve(new Response(answer));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

async function openHome(signedIn: boolean): Promise<void> {
  document.body.innerHTML = LOBBY(signedIn);
  document.body.dataset.user = 'eresy';
  syncHomeGames();
  syncHomeGames();
  await flush();
}

const section = (): HTMLElement | null => queryOne(document, '.ln-ext-home-games', HTMLElement);

const shown = (): string[] =>
  queryAll(
    document,
    '.ln-ext-home-games__row:not([hidden]) > a[href]:first-child',
    HTMLAnchorElement,
  ).map(link => link.getAttribute('href') ?? '');

describe('the home’s recent games', () => {
  it('go before the news, from the signed-in user’s export, asked once', async () => {
    await openHome(true);
    expect(fetches).toHaveLength(1);
    expect(fetches[0]).toMatch(/^\/api\/games\/user\/eresy\?max=25&.*lastFen=true/);
    expect(section()?.nextElementSibling?.classList.contains('lobby__feed')).toBe(true);
    expect(shown()).toEqual(['/game/a1', '/game/b2', '/game/c3']);
  });

  it('stay out signed out, or for a user with no game', async () => {
    await openHome(false);
    expect(fetches).toEqual([]);
    expect(section()).toBeNull();
    answer = '';
    await openHome(true);
    expect(section()).toBeNull();
  });

  it('keep the games of the speed picked, then all of them again', async () => {
    await openHome(true);
    const [every, blitz] = queryAll(
      document,
      '.ln-ext-home-games__filters > button',
      HTMLButtonElement,
    );
    blitz?.click();
    expect(shown()).toEqual(['/game/a1', '/game/c3']);
    expect(blitz?.classList.contains('active')).toBe(true);
    expect(every?.classList.contains('active')).toBe(false);
    every?.click();
    expect(shown()).toEqual(['/game/a1', '/game/b2', '/game/c3']);
  });
});
