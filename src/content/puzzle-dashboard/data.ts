import { z } from 'zod/mini';

// The puzzle dashboard's numbers, from Lichess's own API for it
// (`/api/puzzle/dashboard/<days>`, the signed-in player's), and what the
// overview makes of them: each theme's performance against the level of its
// puzzles, which says where the player does better or worse than expected.

const ResultsSchema = z.object({
  nb: z.number(),
  firstWins: z.number(),
  replayWins: z.number(),
  puzzleRatingAvg: z.number(),
  performance: z.number(),
});

export const DashboardSchema = z.object({
  days: z.number(),
  global: ResultsSchema,
  themes: z.record(z.string(), z.object({ theme: z.string(), results: ResultsSchema })),
});

export type Dashboard = z.infer<typeof DashboardSchema>;

/** Fewer puzzles than this say nothing about a theme. */
const MIN_PUZZLES = 3;
/** How many themes each list shows. */
const LISTED = 4;

export interface ThemeResult {
  readonly key: string;
  readonly name: string;
  readonly puzzles: number;
  readonly firstWins: number;
  /** The puzzles' average rating. */
  readonly level: number;
  readonly performance: number;
  /** Performance minus level: above zero, better than expected. */
  readonly gap: number;
  /** Puzzles failed, not solved since. */
  readonly replays: number;
}

export interface Overview {
  readonly days: number;
  readonly puzzles: number;
  readonly firstWins: number;
  readonly level: number;
  readonly performance: number;
  /** Puzzles failed, not solved since. */
  readonly toReplay: number;
  /** Themes with enough puzzles, best gap first. */
  readonly themes: readonly ThemeResult[];
  /** Themes left out for having too few puzzles. */
  readonly fewer: number;
  readonly weakest: readonly ThemeResult[];
  readonly strongest: readonly ThemeResult[];
}

const byGap = (first: ThemeResult, second: ThemeResult): number =>
  second.gap - first.gap || second.puzzles - first.puzzles;

type Results = z.infer<typeof ResultsSchema>;

const toReplay = (results: Results): number =>
  Math.max(0, results.nb - results.firstWins - results.replayWins);

/** A theme's numbers, from its key and the API's entry for it. */
export function themeResult(
  key: string,
  { theme, results }: Dashboard['themes'][string],
): ThemeResult {
  return {
    key,
    name: theme,
    puzzles: results.nb,
    firstWins: results.firstWins,
    level: results.puzzleRatingAvg,
    performance: results.performance,
    gap: results.performance - results.puzzleRatingAvg,
    replays: toReplay(results),
  };
}

export function overview({ days, global, themes }: Dashboard): Overview {
  const all = Object.entries(themes).map(([key, entry]) => themeResult(key, entry));
  const counted = all.filter(theme => theme.puzzles >= MIN_PUZZLES).toSorted(byGap);
  return {
    days,
    puzzles: global.nb,
    firstWins: global.firstWins,
    level: global.puzzleRatingAvg,
    performance: global.performance,
    toReplay: toReplay(global),
    themes: counted,
    fewer: all.length - counted.length,
    weakest: counted
      .filter(theme => theme.gap < 0)
      .toReversed()
      .slice(0, LISTED),
    strongest: counted.filter(theme => theme.gap > 0).slice(0, LISTED),
  };
}
