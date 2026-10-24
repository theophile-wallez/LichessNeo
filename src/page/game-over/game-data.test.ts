import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFinishedGame, readFinishedGame, roundFinishedGame } from './game-data.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// A finished game's page, as Lichess serves it: its analysis data inlined.
function page(status: string, winner?: string): string {
  const data = {
    mode: 'replay',
    cfg: {
      data: {
        game: {
          id: 'abcd1234',
          status: { id: 31, name: status },
          winner,
          variant: { key: 'standard' },
        },
        treeParts: [
          { ply: 0, fen: START },
          { ply: 1, fen: 'x', uci: 'e2e4', san: 'e4', clock: 30000 },
        ],
      },
    },
  };
  return `<!doctype html><html><body><main></main><script type="application/json" id="page-init-data">${JSON.stringify(data)}</script><script src="/x.js"></script></body></html>`;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('readFinishedGame', () => {
  it('reads the status, the winner and every position', () => {
    expect(readFinishedGame(page('resign', 'black'))).toEqual({
      game: { status: { name: 'resign' }, winner: 'black', variant: { key: 'standard' } },
      treeParts: [
        { ply: 0, fen: START },
        { ply: 1, fen: 'x', uci: 'e2e4', san: 'e4' },
      ],
    });
  });

  it('finds nothing in another page', () => {
    expect(readFinishedGame('<html><body>Too many requests</body></html>')).toBeNull();
    expect(readFinishedGame(page('resign').replace('treeParts', 'steps'))).toBeNull();
  });
});

// A game page's own data, for a game opened once over.
const round = (steps: unknown[]): string =>
  JSON.stringify({
    data: {
      game: { status: { name: 'resign' }, winner: 'black', variant: { key: 'standard' } },
      steps,
    },
  });

describe('roundFinishedGame', () => {
  it('reads its steps as the finished page’s positions', () => {
    const steps = [
      { ply: 0, uci: null, san: null, fen: START },
      { ply: 1, uci: 'e2e4', san: 'e4', fen: 'x' },
    ];
    expect(roundFinishedGame(round(steps))).toEqual(readFinishedGame(page('resign', 'black')));
  });

  it('finds nothing in a page without them', () => {
    expect(roundFinishedGame(round([]).replace('steps', 'treeParts'))).toBeNull();
    expect(roundFinishedGame(null)).toBeNull();
  });
});

describe('fetchFinishedGame', () => {
  it('asks again, a second apart, until the page says the game is over', async () => {
    vi.useFakeTimers();
    const pages = [page('started'), page('mate', 'white')];
    const urls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      urls.push(url);
      return Promise.resolve(new Response(pages.shift() ?? ''));
    });
    const found = fetchFinishedGame('abcd1234', game => game.game.status.name !== 'started');
    await vi.advanceTimersByTimeAsync(1000);
    expect((await found)?.game.status.name).toBe('mate');
    expect(urls).toEqual(['/abcd1234', '/abcd1234']);
  });

  it('gives up after a few tries', async () => {
    vi.useFakeTimers();
    let asked = 0;
    vi.stubGlobal('fetch', () => {
      asked++;
      return Promise.reject(new TypeError('offline'));
    });
    const found = fetchFinishedGame('abcd1234', () => true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await found).toBeNull();
    expect(asked).toBe(5);
  });
});
