import { describe, expect, it } from 'vitest';
import type { Color } from '#shared/chess/types.ts';
import type { RatedGame } from './round.ts';
import { gameStakes } from './rules.ts';
// Rated games watched on lichess.org TV: each player's rating and deviation to the
// hundredth while the game was played, then the change Lichess gave at its end.
import recorded from './fixtures/rated-games.json' with { type: 'json' };

const COLORS = ['white', 'black'] as const;

type Recorded = (typeof recorded.games)[number];

const asGame = (record: Recorded, own: Color | null = null): RatedGame => ({
  id: record.id,
  perf: record.perf,
  variant: record.variant,
  players: {
    white: { user: record.white.user, glicko: record.white.glicko, bot: false },
    black: { user: record.black.user, glicko: record.black.glicko, bot: false },
  },
  own,
});

const outcomeOf = (record: Recorded, color: Color) => {
  if (record.winner === null) return 'draw';
  return record.winner === color ? 'win' : 'loss';
};

// A newcomer against a settled player, to show the rules that move a rating by under a
// point in most games, which the games recorded can't show alone.
const even = (perf: string, variant: string): RatedGame => ({
  id: 'even',
  perf,
  variant,
  players: {
    white: { user: 'new', glicko: { rating: 1500, deviation: 500 }, bot: false },
    black: { user: 'old', glicko: { rating: 1500, deviation: 45 }, bot: false },
  },
  own: null,
});

describe('gameStakes', () => {
  it.each(recorded.games)('gives the change Lichess gave: $perf $id', record => {
    const stakes = gameStakes(asGame(record));
    for (const color of COLORS)
      expect(stakes[color][outcomeOf(record, color)]).toBe(record[color].ratingDiff);
  });

  it('moves a player half as far against a bot', () => {
    const [record] = recorded.games;
    if (!record) throw new Error('no recorded game');
    const human = gameStakes(asGame(record)).white;
    const game = asGame(record);
    const againstBot = gameStakes({
      ...game,
      players: { ...game.players, black: { ...game.players.black, bot: true } },
    }).white;
    for (const outcome of ['win', 'draw', 'loss'] as const)
      expect(Math.abs(againstBot[outcome] - human[outcome] / 2)).toBeLessThanOrEqual(1);
  });

  it('inflates a gain, not a loss, by the perf’s factor', () => {
    const rapid = gameStakes(even('rapid', 'chess960')).white;
    const plain = gameStakes(even('correspondence', 'chess960')).white;
    expect(rapid.win / plain.win).toBeCloseTo(1.015, 2);
    expect(rapid.loss).toBe(plain.loss);
  });

  it('expects more of White where moving first is worth points', () => {
    const standard = gameStakes(even('correspondence', 'standard')).white;
    const crazyhouse = gameStakes(even('correspondence', 'crazyhouse')).white;
    const chess960 = gameStakes(even('correspondence', 'chess960')).white;
    expect(crazyhouse.win).toBeLessThan(standard.win);
    expect(standard.win).toBeLessThan(chess960.win);
  });
});
