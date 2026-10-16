import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCards, keepLastPool, keptCards } from './store.ts';

const KEY = 'lr-ext-speed-cards';
const MAX_AGE = 30 * 1000;

const card = { speed: 'blitz', games: 25, rating: 1584, provisional: true, history: [1500] };

const keep = (user: string, at: number): void =>
  localStorage.setItem(KEY, JSON.stringify({ user, at, cards: [card] }));

const answers: Readonly<Record<string, string>> = {
  '/api/user/eresy': JSON.stringify({ perfs: { rapid: { games: 78, rating: 1673 } } }),
  '/api/user/eresy/rating-history': JSON.stringify([
    { name: 'rapid', points: [[2026, 9, 7, 1673]] },
  ]),
};

let requests: string[];

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', (url: string) => {
    requests.push(url);
    const games = url.startsWith('/api/games/user/eresy?');
    const body = games
      ? JSON.stringify({ speed: 'rapid', clock: { initial: 600, increment: 5 } })
      : answers[url];
    return Promise.resolve(new Response(body ?? '', { status: body === undefined ? 404 : 200 }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('the kept cards', () => {
  it("are the signed-in player's, due again once 30s old", () => {
    keep('eresy', Date.now());
    expect(keptCards('eresy')).toEqual({ cards: [card], stale: false });
    expect(keptCards('someone')).toBeNull();
    keep('eresy', Date.now() - MAX_AGE + 1000);
    expect(keptCards('eresy')?.stale).toBe(false);
    keep('eresy', Date.now() - MAX_AGE);
    expect(keptCards('eresy')?.stale).toBe(true);
  });

  it('are asked of Lichess, then kept', async () => {
    const cards = await fetchCards('eresy');
    expect(requests).toHaveLength(3);
    expect(requests.find(url => url.startsWith('/api/games/'))).toContain(
      'perfType=bullet,blitz,rapid,classical',
    );
    expect(cards?.find(played => played.speed === 'rapid')).toEqual({
      speed: 'rapid',
      games: 78,
      rating: 1673,
      provisional: false,
      // Its first day: from where every rating starts.
      history: [1500, 1673],
      last: '10+5',
    });
    expect(keptCards('eresy')?.cards).toEqual(cards);
    expect(keptCards('eresy')?.last).toBe('10+5');
    // The sidebar's rating comes with them.
    expect(localStorage.getItem('lr-ext-account-rating')).toContain('"rating":1673');
  });

  it("stay as they were when Lichess doesn't know the player", async () => {
    keep('eresy', 0);
    expect(await fetchCards('nobody')).toBeNull();
    expect(keptCards('eresy')?.cards).toEqual([card]);
  });

  it('take the pool just joined as the last, and its speed’s', () => {
    keep('eresy', Date.now());
    expect(keptCards('eresy')?.last).toBeUndefined();
    expect(keepLastPool('eresy', 'blitz', '5+3')?.[0]?.last).toBe('5+3');
    expect(keptCards('eresy')?.cards[0]?.last).toBe('5+3');
    expect(keptCards('eresy')?.last).toBe('5+3');
    expect(keepLastPool('someone', 'blitz', '3+0')).toBeNull();
  });
});
