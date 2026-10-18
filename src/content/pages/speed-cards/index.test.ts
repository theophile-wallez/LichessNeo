import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { createSpeedCards } from './index.ts';

// Lichess's lobby, as lila's ui/lobby draws it: the pools tab first, which
// glows while a pool is sought from another tab, and a pool's click joining
// it, or leaving it if it's the one sought.
interface Lobby {
  tab: string;
  member: string | null;
}

const TABS = ['pools', 'real_time', 'seeks'];

function drawLobby(lobby: Lobby): void {
  const app = document.querySelector('.lobby__app');
  if (!(app instanceof HTMLElement)) return;
  app.className = `lobby__app lobby__app-${lobby.tab}`;
  const tabs = TABS.map(tab => {
    const button = document.createElement('button');
    button.textContent = tab === 'pools' ? 'Appariement rapide' : tab;
    button.classList.toggle('active', tab === lobby.tab);
    button.classList.toggle('glowing', tab === 'pools' && tab !== lobby.tab && !!lobby.member);
    button.addEventListener('click', () => {
      lobby.tab = tab;
      drawLobby(lobby);
    });
    return button;
  });
  const bar = document.createElement('div');
  bar.className = 'tabs-horiz';
  bar.append(...tabs);
  const content = document.createElement('div');
  if (lobby.tab === 'pools') {
    for (const id of ['3+0', '3+2']) {
      const pool = document.createElement('div');
      pool.className = `lpool${lobby.member === id ? ' active' : ''}`;
      pool.dataset.id = id;
      pool.addEventListener('click', () => {
        lobby.member = lobby.member === id ? null : id;
        drawLobby(lobby);
      });
      content.append(pool);
    }
  }
  app.replaceChildren(bar, content);
}

let lobby: Lobby;
let custom: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  document.body.innerHTML = `<main class="lobby">
    <section class="ln-ext-hero"></section>
    <div class="lobby__table"><div class="lobby__start">
      <button class="lobby__start__button lobby__start__button--hook">Create a game</button>
    </div></div>
    <div class="lobby__app"></div>
  </main>`;
  custom = vi.fn<() => void>();
  document.querySelector('.lobby__start__button--hook')?.addEventListener('click', custom);
  lobby = { tab: 'real_time', member: null };
  drawLobby(lobby);
});

afterEach(() => {
  localStorage.clear();
});

const play = (): HTMLButtonElement | null =>
  queryOne(document, '.lobby__start > .ln-ext-play', HTMLButtonElement);

const pool = (id: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-speeds .ln-ext-speed__pool[data-ln-ext-pool='${id}']`, HTMLElement);

describe('the speed cards', () => {
  it("go under the hero, headed by Lichess's quick pairing tab", () => {
    const sync = createSpeedCards(undefined, 'fr');
    sync();
    sync();
    expect(document.querySelectorAll('.ln-ext-speeds')).toHaveLength(1);
    expect(document.querySelector('.ln-ext-hero')?.nextElementSibling?.className).toBe(
      'ln-ext-speeds',
    );
    expect(document.querySelector('.ln-ext-speeds__title')?.textContent).toBe('Appariement rapide');
    const names = [...document.querySelectorAll('.ln-ext-speed__name')].map(
      name => name.textContent,
    );
    expect(names).toEqual(['Bullet', 'Blitz', 'Rapide', 'Classique']);
    // Signed out: the pools only.
    expect(document.querySelector('.ln-ext-speed__rating')).toBeNull();
    expect(document.querySelectorAll('.ln-ext-speed__pool')).toHaveLength(11);
  });

  it("show the player's kept numbers, the last pool as the primary", () => {
    const history = [1500, 1584];
    const cards = [
      { speed: 'blitz', games: 25, rating: 1584, provisional: true, history, last: '3+2' },
    ];
    localStorage.setItem(
      'ln-ext-speed-cards',
      JSON.stringify({ user: 'eresy', at: Date.now(), cards }),
    );
    createSpeedCards('eresy', 'en')();
    const blitz = document.querySelector("[data-ln-ext-speed='blitz']");
    expect(blitz?.querySelector('.ln-ext-speed__rating')?.textContent).toMatch(/1,584\s*\?/);
    // Provisional: a question mark, its word for whoever asks.
    expect(blitz?.querySelector('.ln-ext-speed__provisional')?.getAttribute('title')).toBe(
      'provisional',
    );
    expect(blitz?.querySelector('.ln-ext-speed__games')?.textContent).toBe('25 games');
    // Both lead to the speed's stats page.
    const links = [...(blitz?.querySelectorAll('a') ?? [])].map(link => link.getAttribute('href'));
    expect(links).toEqual(['/@/eresy/perf/blitz', '/@/eresy/perf/blitz']);
    expect(blitz?.querySelector('.ln-ext-speed__line')?.getAttribute('d')).toMatch(/^M0,27C/);
    expect(pool('3+2')?.classList.contains('ln-ext-speed__pool--last')).toBe(true);
    expect(document.querySelector("[data-ln-ext-speed='bullet'] .ln-ext-speed__games")).toBeNull();
  });

  it("join Lichess's pool from the lobby's tab, and leave it on a second click", async () => {
    const sync = createSpeedCards(undefined, 'en');
    sync();
    pool('3+2')?.click();
    await flush();
    expect(lobby).toEqual({ tab: 'real_time', member: '3+2' });
    sync();
    expect(pool('3+2')?.classList.contains('ln-ext-speed__pool--seeking')).toBe(true);
    expect(
      document.querySelector('.ln-ext-speeds')?.classList.contains('ln-ext-speeds--seeking'),
    ).toBe(true);
    // The heading says so, with a button to stop.
    expect(document.querySelector('.ln-ext-speeds__seeking-text')?.textContent).toBe(
      'Looking for a 3 + 2 opponent…',
    );
    queryOne(document, '.ln-ext-speeds__cancel', HTMLElement)?.click();
    await flush();
    expect(lobby).toEqual({ tab: 'real_time', member: null });
    pool('3+2')?.click();
    await flush();
    expect(lobby).toEqual({ tab: 'real_time', member: '3+2' });
    sync();
    pool('3+2')?.click();
    await flush();
    expect(lobby).toEqual({ tab: 'real_time', member: null });
    sync();
    expect(document.querySelector('.ln-ext-speed__pool--seeking')).toBeNull();
  });

  it("follow a pool Lichess joined itself, and leave its pools tab for the lobby's", () => {
    lobby = { tab: 'pools', member: '3+0' };
    drawLobby(lobby);
    createSpeedCards(undefined, 'en')();
    expect(lobby.tab).toBe('real_time');
    expect(pool('3+0')?.classList.contains('ln-ext-speed__pool--seeking')).toBe(true);
  });

  it("open Lichess's game setup from the custom game's pill", () => {
    createSpeedCards(undefined, 'en')();
    queryOne(document, '.ln-ext-speeds__custom', HTMLElement)?.click();
    expect(custom).toHaveBeenCalledOnce();
  });
});

describe('the hero’s play button', () => {
  it('comes first among Lichess’s start buttons, ten minutes for a new player', () => {
    createSpeedCards(undefined, 'fr')();
    expect(document.querySelector('.lobby__start')?.firstElementChild).toBe(play());
    expect(play()?.textContent).toBe('Jouer une partie 10 min');
    expect(play()?.dataset.lnExtSpeed).toBe('rapid');
  });

  it('plays the pool last played, and follows the one picked since', async () => {
    const cards = [{ speed: 'blitz', games: 25, rating: 1584, provisional: false, history: [] }];
    localStorage.setItem(
      'ln-ext-speed-cards',
      JSON.stringify({ user: 'eresy', at: Date.now(), cards, last: '3+2' }),
    );
    const sync = createSpeedCards('eresy', 'en');
    sync();
    expect(play()?.textContent).toBe('Play a 3 + 2 game');
    play()?.click();
    await flush();
    expect(lobby.member).toBe('3+2');
    sync();
    expect(play()?.classList.contains('ln-ext-play--seeking')).toBe(true);
    pool('3+0')?.click();
    await flush();
    sync();
    expect(play()?.textContent).toBe('Play a 3 min game');
    expect(play()?.dataset.lnExtSpeed).toBe('blitz');
  });

  it('is off while Lichess’s own is', async () => {
    const sync = createSpeedCards(undefined, 'en');
    document.querySelector('.lobby__start__button--hook')?.classList.add('disabled');
    sync();
    expect(play()?.classList.contains('disabled')).toBe(true);
    play()?.click();
    await flush();
    expect(lobby.member).toBeNull();
  });

  it('comes back at once when Lichess draws its start buttons again', async () => {
    createSpeedCards(undefined, 'en')();
    const start = document.createElement('div');
    start.className = 'lobby__start';
    document.querySelector('.lobby__start')?.replaceWith(start);
    await flush();
    expect(play()).not.toBeNull();
    expect(start.firstElementChild).toBe(play());
  });
});
