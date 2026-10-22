import { z } from 'zod/mini';

// A player's recent ratings, from Lichess's public API
// (`/api/user/<name>/rating-history`), as a curve: the home's speed cards and
// the hover card both draw one.

export const HistorySchema = z.array(
  z.object({
    name: z.string(),
    points: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])),
  }),
);

export type RatingHistory = z.infer<typeof HistorySchema>;

type HistoryPoint = RatingHistory[number]['points'][number];

const CURVE_POINTS = 30;

/** Every rating starts there (Glicko-2's default, as Lichess has it). */
export const START_RATING = 1500;

/**
 * The curve's ratings, oldest first. Lichess keeps one a day, its last: a speed's first day
 * draws from where every rating starts, and the current rating ends the curve even before the
 * day's point is written.
 */
export function curveOf(points: readonly HistoryPoint[], games: number, rating: number): number[] {
  if (games === 0) return [];
  const ratings = points.slice(-CURVE_POINTS).map(point => point[3]);
  if (ratings.at(-1) !== rating) ratings.push(rating);
  if (ratings.length === 1 && points.length <= 1) ratings.unshift(START_RATING);
  return ratings.slice(-CURVE_POINTS);
}

/** The points of one rating's series, named by its key (`blitz`); Lichess's docs capitalize them. */
export const seriesOf = (history: RatingHistory, key: string): readonly HistoryPoint[] =>
  history.find(entry => entry.name.toLowerCase() === key.toLowerCase())?.points ?? [];
