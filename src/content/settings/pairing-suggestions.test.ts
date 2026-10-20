import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PICKS, type CardPick } from '#content/pages/speed-cards/picks.ts';
import { recentGames, suggestionsOf } from './pairing-suggestions.ts';

// `/api/games/user/<name>`'s lines, cut to what's read.
interface Game {
  readonly variant?: string;
  readonly rated?: boolean;
  readonly source?: string;
  readonly clock?: { initial: number; increment: number } | null;
}

const game = ({ variant = 'standard', rated = true, source, clock }: Game): string =>
  JSON.stringify({
    variant,
    rated,
    ...(source && { source }),
    ...(clock !== null && { clock: clock ?? { initial: 180, increment: 2 } }),
  });

const games = (count: number, played: Game): string[] =>
  Array.from({ length: count }, () => game(played));

const lines = (...groups: string[][]): string => groups.flat().join('\n');

const chess960 = (initial: number, increment: number): Game => ({
  variant: 'chess960',
  clock: { initial, increment },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('suggestionsOf', () => {
  it('suggests a card per variant and mode, its three most played time controls first', () => {
    const ndjson = lines(
      games(4, chess960(180, 2)),
      games(2, chess960(600, 0)),
      games(3, chess960(60, 0)),
      games(1, chess960(300, 3)),
    );
    expect(suggestionsOf(ndjson, DEFAULT_PICKS)).toEqual([
      {
        pick: {
          custom: {
            variant: 'chess960',
            rated: true,
            clocks: [
              { minutes: 3, increment: 2 },
              { minutes: 1, increment: 0 },
              { minutes: 10, increment: 0 },
            ],
          },
        },
        games: 10,
      },
    ]);
  });

  it('leaves out one-offs, games against the computer and games without a clock', () => {
    const ndjson = lines(
      games(2, chess960(180, 2)),
      games(5, { variant: 'atomic', source: 'ai' }),
      games(5, { variant: 'horde', clock: null }),
      ['', 'not json'],
    );
    expect(suggestionsOf(ndjson, DEFAULT_PICKS)).toEqual([]);
  });

  it('tells a rated card from a casual one', () => {
    const ndjson = lines(
      games(3, { variant: 'atomic' }),
      games(4, { variant: 'atomic', rated: false }),
    );
    expect(
      suggestionsOf(ndjson, DEFAULT_PICKS).map(({ pick }) => 'custom' in pick && pick.custom.rated),
    ).toEqual([false, true]);
  });

  it('suggests nothing the cards already play all of', () => {
    // Standard 3+2 is Blitz's pool.
    expect(suggestionsOf(lines(games(6, {})), DEFAULT_PICKS)).toEqual([]);
    const custom = {
      variant: 'atomic' as const,
      rated: true,
      clocks: [{ minutes: 3, increment: 2 }],
    };
    const picks: CardPick[] = [...DEFAULT_PICKS, { custom }];
    expect(suggestionsOf(lines(games(3, { variant: 'atomic' })), picks)).toEqual([]);
  });

  it('puts back the default cards taken off, with how much their speed is played', () => {
    const picks: CardPick[] = [{ speed: 'bullet' }, { speed: 'rapid' }];
    const ndjson = lines(games(2, { clock: { initial: 600, increment: 0 } }), games(5, {}));
    expect(suggestionsOf(ndjson, picks)).toEqual([
      { pick: { speed: 'blitz' }, games: 5 },
      { pick: { speed: 'classical' }, games: 0 },
    ]);
  });
});

describe('recentGames', () => {
  it('asks Lichess for the player’s last games, one a line', async () => {
    const fetchGames = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response('{}\n{}')),
    );
    vi.stubGlobal('fetch', fetchGames);
    await expect(recentGames('Eresy')).resolves.toBe('{}\n{}');
    expect(fetchGames.mock.calls[0]?.[0]).toMatch(/^\/api\/games\/user\/Eresy\?max=200&/);
  });

  it('gives no games when Lichess fails or can’t be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 429 })));
    await expect(recentGames('Eresy')).resolves.toBe('');
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    await expect(recentGames('Eresy')).resolves.toBe('');
  });
});
