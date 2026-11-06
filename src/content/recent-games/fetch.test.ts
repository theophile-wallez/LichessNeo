import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRecentGames } from './fetch.ts';

const game = (id: string): string =>
  JSON.stringify({
    id,
    speed: 'blitz',
    lastMoveAt: 1_792_614_257_022,
    status: 'mate',
    players: {
      white: { user: { name: 'Eresy', id: 'eresy' }, rating: 1429 },
      black: { user: { name: 'Chlodowech', id: 'chlodowech' }, rating: 1508 },
    },
    winner: 'white',
    lastFen: '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1',
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a player’s recent games, fetched', () => {
  it('asks the export for a few more than shown, with their last positions', async () => {
    const asked: [string, RequestInit | undefined][] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      asked.push([url, init]);
      return Promise.resolve(new Response([game('a1'), game('b2'), game('c3')].join('\n')));
    });
    const games = await fetchRecentGames('Eresy', 2);
    expect(games.map(({ href }) => href)).toEqual(['/game/a1', '/game/b2']);
    expect(asked).toHaveLength(1);
    expect(asked[0]?.[0]).toMatch(/^\/api\/games\/user\/Eresy\?max=7&.*lastFen=true/);
    expect(asked[0]?.[1]?.headers).toEqual({ Accept: 'application/x-ndjson' });
  });

  it('are none when Lichess refuses or can’t be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(game('a1'), { status: 429 })));
    expect(await fetchRecentGames('Eresy', 5)).toEqual([]);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect(await fetchRecentGames('Eresy', 5)).toEqual([]);
  });
});
