import type { Dashboard } from '#content/puzzle-dashboard/data.ts';

// A player's dashboard as `/api/puzzle/dashboard/30` answers, cut to a few themes.

const results = (nb: number, firstWins: number, puzzleRatingAvg: number, performance: number) => ({
  nb,
  firstWins,
  replayWins: 0,
  puzzleRatingAvg,
  performance,
});

/** The themes by key, each sure to be there. */
export const THEMES = {
  endgame: { theme: 'Endgame', results: results(19, 9, 2117, 2091) },
  exposedKing: { theme: 'Exposed king', results: results(3, 3, 2011, 2511) },
  rookEndgame: { theme: 'Rook endgame', results: results(4, 3, 2092, 2342) },
  fork: { theme: 'Fork', results: results(6, 3, 2089, 2089) },
  sacrifice: { theme: 'Sacrifice', results: results(4, 1, 2164, 1864) },
  defensiveMove: { theme: 'Defensive move', results: results(4, 1, 2153, 1903) },
  // Too few puzzles to say anything.
  pin: { theme: 'Pin', results: results(2, 0, 2169, 1669) },
  promotion: { theme: 'Promotion', results: results(1, 1, 2224, 2724) },
} satisfies Dashboard['themes'];

export const DASHBOARD: Dashboard = {
  days: 30,
  global: { nb: 41, firstWins: 18, replayWins: 0, puzzleRatingAvg: 2099, performance: 2038 },
  themes: THEMES,
};
