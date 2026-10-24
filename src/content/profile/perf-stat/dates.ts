import { pageLocale } from '#shared/lang.ts';

// The stats page's dates, without the time of day Lichess writes after each:
// a day, or a streak's first and last days as one range ("Apr 21 – Nov 26, 2021").

const dayFormat = (): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(pageLocale(), { dateStyle: 'medium' });

export const formatDay = (at: string): string => dayFormat().format(new Date(at));

/** The days from `from` to `to`, one day when both fall on it. */
export const formatDays = (from: string, to: string): string =>
  dayFormat().formatRange(new Date(from), new Date(to));
