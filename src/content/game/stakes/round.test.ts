import { describe, expect, it } from 'vitest';
import { ratedGame } from './round.ts';

// The round data of a game page, trimmed to what the stakes read.
const user = (id: string, rating: number, rd: number, title?: string) => ({
  id,
  ...(title ? { title } : {}),
  perfs: { blitz: { rating, rd } },
});

interface Overrides {
  readonly rated?: boolean;
  readonly status?: string;
  readonly spectator?: boolean;
  readonly anonymous?: boolean;
}

function initData(overrides: Overrides = {}): string {
  return JSON.stringify({
    data: {
      game: {
        id: 'abcd1234',
        rated: overrides.rated ?? true,
        perf: 'blitz',
        variant: { key: 'standard' },
        status: { name: overrides.status ?? 'started' },
      },
      player: {
        color: 'black',
        user: user('alice', 1830, 62),
        ...(overrides.spectator ? { spectator: true } : {}),
      },
      opponent: {
        color: 'white',
        ...(overrides.anonymous ? {} : { user: user('bot-bob', 1900, 80, 'BOT') }),
      },
    },
  });
}

describe('ratedGame', () => {
  it("reads each side's rating and deviation in the game's perf, and the player's side", () => {
    expect(ratedGame(initData())).toEqual({
      id: 'abcd1234',
      perf: 'blitz',
      variant: 'standard',
      players: {
        white: { user: 'bot-bob', glicko: { rating: 1900, deviation: 80 }, bot: true },
        black: { user: 'alice', glicko: { rating: 1830, deviation: 62 }, bot: false },
      },
      own: 'black',
    });
  });

  it('has no side of its own for a watcher', () => {
    expect(ratedGame(initData({ spectator: true }))?.own).toBeNull();
  });

  it('is none for a casual game, or one already over', () => {
    expect(ratedGame(initData({ rated: false }))).toBeNull();
    expect(ratedGame(initData({ status: 'mate' }))).toBeNull();
  });

  it('is none against an anonymous player, or without the data', () => {
    expect(ratedGame(initData({ anonymous: true }))).toBeNull();
    expect(ratedGame(null)).toBeNull();
  });
});
