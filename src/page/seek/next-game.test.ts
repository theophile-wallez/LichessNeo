import { describe, expect, it } from 'vitest';
import { GameSeekDataSchema, nextGameAfter, nextGameOf, nextGameOfLink } from './next-game.ts';

// A game page's init data, as much of it as the next game needs (lila's round JSON).
const round = (source: string, opponent?: string): string =>
  JSON.stringify({
    data: {
      game: { id: 'abcd1234', source },
      clock: { initial: 120, increment: 1, running: false },
      opponent: { color: 'black', ...(opponent ? { user: { id: opponent } } : {}) },
    },
  });

describe('what Lichess’s "New opponent" seeks', () => {
  it('joins the game’s pool, away from the same opponent, when signed in', () => {
    expect(nextGameOf(round('pool', 'bob'), true)).toEqual({
      request: { kind: 'pool', member: { id: '2+1', blocking: 'bob' } },
      fallback: '/#pool/2+1/bob',
    });
    expect(nextGameOf(round('pool'), true)?.fallback).toBe('/#pool/2+1');
  });

  it('seeks like the game in the lobby after a lobby game, or a pool one signed out', () => {
    const like = {
      request: { kind: 'like', gameId: 'abcd1234' },
      fallback: '/?hook_like=abcd1234',
    };
    expect(nextGameOf(round('lobby', 'bob'), true)).toEqual(like);
    expect(nextGameOf(round('pool', 'bob'), false)).toEqual(like);
  });

  it('seeks nothing after other games, nor on other pages', () => {
    expect(nextGameOf(round('friend', 'bob'), true)).toBeNull();
    expect(nextGameOf(JSON.stringify({ data: {} }), true)).toBeNull();
    expect(nextGameOf(null, true)).toBeNull();
  });
});

// An analysis controller's data, as much of it as a new game needs.
const analysed = (source: string, clock: boolean) =>
  GameSeekDataSchema.parse({
    game: { id: 'abcd1234', source },
    clock: clock ? { initial: 180, increment: 2 } : null,
    opponent: { user: { id: 'bob' } },
  });

describe('what a new game after an analysed one seeks', () => {
  it('does as Lichess’s "New opponent" would', () => {
    expect(nextGameAfter(analysed('pool', true), true)?.fallback).toBe('/#pool/3+2/bob');
    expect(nextGameAfter(analysed('lobby', true), true)?.fallback).toBe('/?hook_like=abcd1234');
  });

  it('seeks like the game in the lobby where Lichess wouldn’t, but never without a clock', () => {
    expect(nextGameAfter(analysed('friend', true), true)).toEqual({
      request: { kind: 'like', gameId: 'abcd1234' },
      fallback: '/?hook_like=abcd1234',
    });
    expect(nextGameAfter(analysed('ai', true), false)?.fallback).toBe('/?hook_like=abcd1234');
    expect(nextGameAfter(analysed('pool', false), true)).toBeNull();
  });
});

describe('what a link to a next game seeks', () => {
  it('reads our "New 10 min" as a seek like its game', () => {
    expect(nextGameOfLink('https://lichess.org/?hook_like=abcd1234', true)).toEqual({
      request: { kind: 'like', gameId: 'abcd1234' },
      fallback: 'https://lichess.org/?hook_like=abcd1234',
    });
  });

  it('reads a pool’s link, for the signed in only', () => {
    expect(nextGameOfLink('https://lichess.org/#pool/3+2/bob', true)?.request).toEqual({
      kind: 'pool',
      member: { id: '3+2', blocking: 'bob' },
    });
    expect(nextGameOfLink('https://lichess.org/#pool/3+2/bob', false)).toBeNull();
    expect(nextGameOfLink('https://lichess.org/tournament/abc', true)).toBeNull();
  });
});
