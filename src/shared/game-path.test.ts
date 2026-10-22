import { describe, expect, it } from 'vitest';
import { GAME_PAGE, gameIdFrom } from './game-path.ts';

describe('GAME_PAGE', () => {
  it('matches a game page, watched or played', () => {
    expect(GAME_PAGE.test('/game/abcdefgh')).toBe(true);
    expect(GAME_PAGE.test('/game/abcdefgh/black')).toBe(true);
    expect(GAME_PAGE.test('/game/abcdefgh1234')).toBe(true);
  });

  it('matches no other page', () => {
    expect(GAME_PAGE.test('/training')).toBe(false);
    expect(GAME_PAGE.test('/game/abcdefgh/black/analysis')).toBe(false);
    expect(GAME_PAGE.test('/embed/game/abcdefgh')).toBe(false);
    expect(GAME_PAGE.test('/abcdefgh/black')).toBe(false);
  });
});

describe('gameIdFrom', () => {
  it('reads the game id a path starts with', () => {
    expect(gameIdFrom('/game/abcdefgh/black')).toBe('abcdefgh');
    expect(gameIdFrom('/game/abcdefgh1234')).toBe('abcdefgh');
    expect(gameIdFrom('/tv/blitz')).toBeNull();
    expect(gameIdFrom('/game/export/abcdefgh')).toBeNull();
  });
});
