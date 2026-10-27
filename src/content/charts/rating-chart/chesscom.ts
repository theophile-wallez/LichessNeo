import { seriesKey } from '#shared/charts/colors.ts';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import type { RatingPoint, Series } from './series.ts';

// With the settings' Chess.com ratings on, each curve of a speed Chess.com has a
// pool for is drawn in its equivalents; the variants' and the puzzles' stay
// Lichess's, as they do everywhere else.

function converted(series: Series): Series {
  const speed = seriesKey(series.index);
  if (speed === undefined) return series;
  const points = series.points.map(([time, rating]): RatingPoint => [
    time,
    chesscomRating(speed, rating)?.rating ?? rating,
  ]);
  return { ...series, points };
}

export const inChesscomRatings = (series: readonly Series[]): Series[] => series.map(converted);
