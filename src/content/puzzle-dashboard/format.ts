import { pageLocale } from '#shared/lang.ts';

// Numbers as the overview writes them, in the page's language.

export const number = (value: number): string =>
  new Intl.NumberFormat(pageLocale()).format(Math.round(value));

export const percent = (share: number): string =>
  new Intl.NumberFormat(pageLocale(), { style: 'percent' }).format(share);

export const days = (count: number): string =>
  new Intl.NumberFormat(pageLocale(), { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(
    count,
  );

/** A gap with its sign: "+250", "−250" (a true minus), "±0". */
export function signed(gap: number): string {
  const rounded = Math.round(gap);
  if (rounded === 0) return '±0';
  return `${rounded > 0 ? '+' : '−'}${number(Math.abs(rounded))}`;
}

/** Which way a gap goes, for its color. */
export function sign(gap: number): 'up' | 'down' | 'even' {
  const rounded = Math.round(gap);
  if (rounded === 0) return 'even';
  return rounded > 0 ? 'up' : 'down';
}

/** A theme's own puzzles, on Lichess's training page. */
export const trainHref = (key: string): string => `/training/${encodeURIComponent(key)}`;
