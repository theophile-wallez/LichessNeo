import { describe, expect, it } from 'vitest';
import { freshGameId, playedGame } from './round-init.ts';

const roundData = (turns: number, spectator?: boolean): string =>
  JSON.stringify({
    data: {
      game: { id: 'abcd1234', status: { id: 20, name: 'started' }, turns },
      player: { color: 'white', ...(spectator === undefined ? {} : { spectator }) },
    },
  });

describe('freshGameId', () => {
  it('names a game its player opens before the second move', () => {
    expect(freshGameId(roundData(0))).toBe('abcd1234');
    expect(freshGameId(roundData(1))).toBe('abcd1234');
  });

  it('leaves out games under way, spectators and other pages', () => {
    expect(freshGameId(roundData(2))).toBeNull();
    expect(freshGameId(roundData(0, true))).toBeNull();
    expect(freshGameId(JSON.stringify({ data: {} }))).toBeNull();
    expect(freshGameId(null)).toBeNull();
  });
});

const round = (color: string, spectator?: boolean, status = 'started'): string =>
  JSON.stringify({
    data: {
      game: { id: 'abcd1234', status: { name: status } },
      player: { color, ...(spectator === undefined ? {} : { spectator }) },
    },
  });

describe('playedGame', () => {
  it('names the game its player watches, and their color', () => {
    expect(playedGame(round('black'))).toEqual({ gameId: 'abcd1234', color: 'black', live: true });
    expect(playedGame(round('white', false, 'created'))).toEqual({
      gameId: 'abcd1234',
      color: 'white',
      live: true,
    });
  });

  it('names a game its player opens once over, as not live', () => {
    expect(playedGame(round('white', false, 'resign'))).toEqual({
      gameId: 'abcd1234',
      color: 'white',
      live: false,
    });
  });

  it('leaves out spectators and other pages', () => {
    expect(playedGame(round('white', true))).toBeNull();
    expect(playedGame(null)).toBeNull();
  });
});
