import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { readStoredJson } from '#shared/storage.ts';
import { flush } from '#shared/testing/timers.ts';
import type { FinishedGame } from './move-times.ts';
import { refreshAfterGame } from './rating-refresh.ts';

let game: FinishedGame | null = null;
vi.mock('./move-times.ts', () => ({ finishedGame: () => game }));

const FOLLOW_UP = `<main class="round"><div class="rcontrols"><div class="follow-up">
  <button class="fbt rematch">Rematch</button>
</div></div></main>`;

let fetches: string[];

beforeEach(() => {
  fetches = [];
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    const body = { perfs: { bullet: { games: 3, rating: 1508, prov: true } } };
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  document.body.dataset.user = 'eresy';
  localStorage.setItem(
    'ln-ext-speed-cards',
    JSON.stringify({ user: 'eresy', at: Date.now(), cards: [] }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

const keptAt = (): number | undefined =>
  readStoredJson('ln-ext-speed-cards', z.object({ at: z.number() }))?.at;

describe('after a game', () => {
  it("asks for the player's rating again, once, and has the cards asked for on the next visit", async () => {
    document.body.innerHTML = FOLLOW_UP;
    game = { id: 'abcd1234', clock: { initial: 60, increment: 0 } };
    await refreshAfterGame();
    await flush();
    expect(fetches).toEqual(['/api/user/eresy']);
    expect(localStorage.getItem('ln-ext-account-rating')).toContain('"rating":1508');
    expect(keptAt()).toBe(0);
    await refreshAfterGame();
    expect(fetches).toHaveLength(1);
  });

  it('leaves them alone for a spectator', async () => {
    document.body.innerHTML =
      '<main class="round"><div class="rcontrols"><div class="follow-up"></div></div></main>';
    game = { id: 'efgh5678', clock: { initial: 60, increment: 0 } };
    await refreshAfterGame();
    expect(fetches).toEqual([]);
    expect(keptAt()).not.toBe(0);
  });

  it('waits for <body>, which the sync loop starts before', async () => {
    const body = document.body;
    body.remove();
    game = { id: 'ijkl9012', clock: { initial: 60, increment: 0 } };
    try {
      await expect(refreshAfterGame()).resolves.toBeUndefined();
    } finally {
      document.documentElement.append(body);
    }
    expect(fetches).toEqual([]);
  });
});
