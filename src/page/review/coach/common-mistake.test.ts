import { describe, expect, it } from 'vitest';
import { AFTER_E4, theoryMove } from '#page/review/fixtures/theory.ts';
import { en } from '#page/review/i18n/en.ts';
import type { PlayersAt } from '#page/review/theory/players.ts';
import { commonMistake } from './common-mistake.ts';

/** `games` games from the position, `f6` played in `played` of them. */
const players = (games: number, played: number, rated = true): PlayersAt => ({
  data: {
    white: games,
    draws: 0,
    black: 0,
    moves: [
      { uci: 'e7e5', san: 'e5', white: games - played, draws: 0, black: 0 },
      { uci: 'f7f6', san: 'f6', white: played, draws: 0, black: 0 },
    ],
  },
  rated,
});

const f6 = theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2, loss: 20 });

describe('commonMistake', () => {
  it('says how many players at the mover’s level make the error', () => {
    expect(commonMistake(f6, en, players(1000, 80))).toMatch(/8%.*(this level|this rating)/);
  });

  it('speaks of Lichess’s club players for a mover without a rating', () => {
    expect(commonMistake(f6, en, players(1000, 80, false))).toBe(
      'A classic mistake: 8% of Lichess players play it here.',
    );
  });

  it('says nothing of a rare error, nor below 300 games', () => {
    expect(commonMistake(f6, en, players(1000, 29))).toBeNull();
    expect(commonMistake(f6, en, players(1000, 30))).not.toBeNull();
    expect(commonMistake(f6, en, players(299, 100))).toBeNull();
    expect(commonMistake(f6, en, players(300, 100))).not.toBeNull();
  });

  it('says nothing of a move that’s no error, nor before the players are in', () => {
    const good = theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2 });
    expect(commonMistake(good, en, players(1000, 80))).toBeNull();
    expect(commonMistake(f6, en, null)).toBeNull();
  });
});
