import { describe, expect, it } from 'vitest';
import type { RatingHistory } from '#shared/rating-history.ts';
import type { CardUser, RecentGame } from './api.ts';
import { formOf, headlineOf, playedTime, shareOf, tallyOf, type GameResult } from './facts.ts';

const PLAYER: CardUser = {
  perfs: {
    bullet: { games: 420, rating: 2180 },
    blitz: { games: 1200, rating: 2410, prog: 23 },
  },
  count: { win: 600, loss: 400, draw: 200 },
};

const HISTORY: RatingHistory = [
  { name: 'Bullet', points: [[2026, 9, 20, 2170]] },
  {
    name: 'Blitz',
    points: [
      [2026, 9, 19, 2380],
      [2026, 9, 20, 2395],
    ],
  },
];

const game = (
  id: string,
  sides: readonly [string, string],
  end: { readonly status?: string; readonly winner?: 'white' | 'black' } = {},
): RecentGame => ({
  id,
  status: end.status ?? 'mate',
  ...(end.winner !== undefined && { winner: end.winner }),
  players: { white: { user: { id: sides[0] } }, black: { user: { id: sides[1] } } },
});

const results = (games: readonly RecentGame[], name: string, max = 5): GameResult[] =>
  formOf(games, name, max).map(form => form.result);

describe('the rating the card leads with', () => {
  it('is the most played speed’s, its progress, and its last month as a curve', () => {
    expect(headlineOf(PLAYER, HISTORY)).toEqual({
      speed: 'blitz',
      rating: 2410,
      provisional: false,
      progress: 23,
      curve: [2380, 2395, 2410],
    });
  });

  it('leaves the progress out when the rating hasn’t moved', () => {
    const steady: CardUser = { perfs: { rapid: { games: 12, rating: 1620, prog: 0 } } };
    expect(headlineOf(steady, [])).not.toHaveProperty('progress');
  });

  it('draws no curve for a player Lichess answers no history for', () => {
    expect(headlineOf(PLAYER, [])?.curve).toEqual([]);
    expect(headlineOf(PLAYER, undefined)?.curve).toEqual([]);
  });

  it('is none before a first game', () => {
    expect(headlineOf({ perfs: {} }, HISTORY)).toBeNull();
  });
});

describe('their record', () => {
  it('counts the games it splits, and each share as a whole percentage', () => {
    const tally = tallyOf(PLAYER);
    expect(tally).toEqual({ win: 600, draw: 200, loss: 400, total: 1200 });
    expect(shareOf(tally?.win ?? 0, tally?.total ?? 1)).toBe(50);
  });

  it('is none for a player who has played none, or whom Lichess counts none for', () => {
    expect(tallyOf({ perfs: {}, count: { win: 0, loss: 0, draw: 0 } })).toBeNull();
    expect(tallyOf({ perfs: {} })).toBeNull();
  });
});

describe('how long they’ve played', () => {
  it('is hours past an hour, minutes under it, and nothing under a minute', () => {
    expect(playedTime(18 * 3600 + 1800)).toEqual({ value: 18, unit: 'hour' });
    expect(playedTime(25 * 60)).toEqual({ value: 25, unit: 'minute' });
    expect(playedTime(42)).toBeNull();
  });
});

describe('their form', () => {
  it('reads each game from their own side, the newest first', () => {
    const games = [
      game('aaaa1111', ['hikaru', 'other'], { winner: 'white' }),
      game('bbbb2222', ['other', 'hikaru'], { winner: 'white' }),
      game('cccc3333', ['hikaru', 'other'], { status: 'draw' }),
    ];
    expect(formOf(games, 'Hikaru', 5)).toEqual([
      { result: 'win', gameId: 'aaaa1111' },
      { result: 'loss', gameId: 'bbbb2222' },
      { result: 'draw', gameId: 'cccc3333' },
    ]);
  });

  it('skips the game being played, which is why one more game is asked for', () => {
    const games = [
      game('aaaa1111', ['hikaru', 'other'], { status: 'started' }),
      game('bbbb2222', ['hikaru', 'other'], { winner: 'black' }),
    ];
    expect(results(games, 'hikaru')).toEqual(['loss']);
  });

  it('skips a game neither side is theirs, as an import is', () => {
    const anonymous: RecentGame = {
      id: 'dddd4444',
      status: 'mate',
      players: { white: {}, black: {} },
    };
    expect(results([anonymous, game('eeee5555', ['hikaru', 'other'])], 'hikaru')).toEqual(['draw']);
  });

  it('stops at the dots the card has room for', () => {
    const games = Array.from({ length: 8 }, (_, index) =>
      game(`game${index}`, ['hikaru', 'other'], { winner: 'white' }),
    );
    expect(results(games, 'hikaru', 5)).toEqual(['win', 'win', 'win', 'win', 'win']);
  });
});
