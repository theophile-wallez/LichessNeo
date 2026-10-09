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
    <section class="lr-ext-hero"></section>
    <div class="lobby__table"><button class="lobby__start__button--hook"></button></div>
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

const pool = (id: string): HTMLElement | null =>
  queryOne(document, `.lr-ext-speeds .lr-ext-speed__pool[data-lr-ext-pool='${id}']`, HTMLElement);

describe('the speed cards', () => {
  it("go under the hero, headed by Lichess's quick pairing tab", () => {
    const sync = createSpeedCards(undefined, 'fr');
    sync();
    sync();
    expect(document.querySelectorAll('.lr-ext-speeds')).toHaveLength(1);
    expect(document.querySelector('.lr-ext-hero')?.nextElementSibling?.className).toBe(
      'lr-ext-speeds',
    );
    expect(document.querySelector('.lr-ext-speeds__title')?.textContent).toBe('Appariement rapide');
    const names = [...document.querySelectorAll('.lr-ext-speed__name')].map(
      name => name.textContent,
    );
    expect(names).toEqual(['Bullet', 'Blitz', 'Rapide', 'Classique']);
    // Signed out: the pools only.
    expect(document.querySelector('.lr-ext-speed__rating')).toBeNull();
    expect(document.querySelectorAll('.lr-ext-speed__pool')).toHaveLength(11);
  });

  it("show the player's kept numbers, the last pool as the primary", () => {
    const history = [1500, 1584];
    const cards = [
      { speed: 'blitz', games: 25, rating: 1584, provisional: true, history, last: '3+2' },
    ];
    localStorage.setItem(
      'lr-ext-speed-cards',
      JSON.stringify({ user: 'eresy', at: Date.now(), cards }),
    );
    createSpeedCards('eresy', 'en')();
    const blitz = document.querySelector("[data-lr-ext-speed='blitz']");
    expect(blitz?.querySelector('.lr-ext-speed__rating')?.textContent).toMatch(/1,584\s*\?/);
    // Provisional: a question mark, its word for whoever asks.
    expect(blitz?.querySelector('.lr-ext-speed__provisional')?.getAttribute('title')).toBe(
      'provisional',
    );
    expect(blitz?.querySelector('.lr-ext-speed__games')?.textContent).toBe('25 games');
    // Both lead to the speed's stats page.
    const links = [...(blitz?.querySelectorAll('a') ?? [])].map(link => link.getAttribute('href'));
    expect(links).toEqual(['/@/eresy/perf/blitz', '/@/eresy/perf/blitz']);
    expect(blitz?.querySelector('.lr-ext-speed__line')?.getAttribute('d')).toMatch(/^M0,27C/);
    expect(pool('3+2')?.classList.contains('lr-ext-speed__pool--last')).toBe(true);
    expect(document.querySelector("[data-lr-ext-speed='bullet'] .lr-ext-speed__games")).toBeNull();
  });

  it("join Lichess's pool from the lobby's tab, and leave it on a second click", async () => {
    const sync = createSpeedCards(undefined, 'en');
    sync();
    pool('3+2')?.click();
    await flush();
    expect(lobby).toEqual({ tab: 'real_time', member: '3+2' });
    sync();
    expect(pool('3+2')?.classList.contains('lr-ext-speed__pool--seeking')).toBe(true);
    expect(
      document.querySelector('.lr-ext-speeds')?.classList.contains('lr-ext-speeds--seeking'),
    ).toBe(true);
    // The heading says so, with a button to stop.
    expect(document.querySelector('.lr-ext-speeds__seeking-text')?.textContent).toBe(
      'Looking for a 3 + 2 opponent…',
    );
    queryOne(document, '.lr-ext-speeds__cancel', HTMLElement)?.click();
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
    expect(document.querySelector('.lr-ext-speed__pool--seeking')).toBeNull();
  });

  it("follow a pool Lichess joined itself, and leave its pools tab for the lobby's", () => {
    lobby = { tab: 'pools', member: '3+0' };
    drawLobby(lobby);
    createSpeedCards(undefined, 'en')();
    expect(lobby.tab).toBe('real_time');
    expect(pool('3+0')?.classList.contains('lr-ext-speed__pool--seeking')).toBe(true);
  });

  it("open Lichess's game setup from the custom game's pill", () => {
    createSpeedCards(undefined, 'en')();
    queryOne(document, '.lr-ext-speeds__custom', HTMLElement)?.click();
    expect(custom).toHaveBeenCalledOnce();
  });
});
