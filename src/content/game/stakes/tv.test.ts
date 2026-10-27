import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportedGame, type GameExport, TV_PAGE } from './tv.ts';

// What /api/user/<id>/perf/<perf> answers, per user.
function serveStats(stats: Readonly<Record<string, { rating: number; deviation: number }>>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<Response>>(url => {
      const user = /\/api\/user\/([^/]+)\//.exec(url)?.[1] ?? '';
      const glicko = stats[user];
      return Promise.resolve(
        glicko ? Response.json({ perf: { glicko } }) : new Response(null, { status: 404 }),
      );
    }),
  );
}

const exported = (changes: Partial<GameExport> = {}): GameExport => ({
  id: 'fzQ8YjvP',
  rated: true,
  perf: 'blitz',
  variant: 'standard',
  status: 'started',
  players: {
    white: { user: { id: 'cutemouse83', title: 'GM' }, rating: 2984 },
    black: { user: { id: 'vistagusta' }, rating: 2877 },
  },
  ...changes,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('exportedGame', () => {
  it("reads each player's rating to the hundredth and deviation from their stats", async () => {
    serveStats({
      cutemouse83: { rating: 2984.31, deviation: 45 },
      vistagusta: { rating: 2877.9, deviation: 51.2 },
    });
    expect(await exportedGame(exported())).toEqual({
      id: 'fzQ8YjvP',
      perf: 'blitz',
      variant: 'standard',
      players: {
        white: { user: 'cutemouse83', glicko: { rating: 2984.31, deviation: 45 }, bot: false },
        black: { user: 'vistagusta', glicko: { rating: 2877.9, deviation: 51.2 }, bot: false },
      },
      own: null,
    });
  });

  it("falls back on the game's whole rating when the stats have moved since", async () => {
    serveStats({
      cutemouse83: { rating: 2991.02, deviation: 46.5 },
      vistagusta: { rating: 2877.9, deviation: 51.2 },
    });
    expect((await exportedGame(exported()))?.players.white.glicko).toEqual({
      rating: 2984,
      deviation: 46.5,
    });
  });

  it('is none for a casual game, one over, or a player whose stats are out of reach', async () => {
    serveStats({ cutemouse83: { rating: 2984.31, deviation: 45 } });
    expect(await exportedGame(exported({ rated: false }))).toBeNull();
    expect(await exportedGame(exported({ status: 'mate' }))).toBeNull();
    expect(await exportedGame(exported())).toBeNull();
  });
});

describe('TV_PAGE', () => {
  it("is a channel's or a user's TV, not the current games", () => {
    expect(['/tv', '/tv/blitz', '/@/vistagusta/tv'].every(path => TV_PAGE.test(path))).toBe(true);
    expect(['/games', '/game/fzQ8YjvP', '/tvx'].some(path => TV_PAGE.test(path))).toBe(false);
  });
});
