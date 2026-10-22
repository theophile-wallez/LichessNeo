import { isFrench } from '#shared/lang.ts';
import { PERCENT } from './model.ts';

// The answer's names come translated by the server; its numbers come raw, so
// every one of them is written through Intl.

const SECONDS = 'seconds';

export interface Formats {
  /** A value of the metric, as its data type asks. */
  readonly value: (value: number, dataType: string) => string;
  readonly count: (value: number) => string;
  /** A category of the date dimension: seconds since the epoch. */
  readonly date: (seconds: number) => string;
}

export function numberFormats(locale: string | undefined): Formats {
  // Two decimals, as the table beside the chart writes the same numbers.
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const share = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const seconds = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    maximumFractionDigits: 1,
  });
  const count = new Intl.NumberFormat(locale);
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return {
    value: (value, dataType) => {
      if (dataType === PERCENT) return share.format(value / 100);
      if (dataType === SECONDS) return seconds.format(value);
      return plain.format(value);
    },
    count: value => count.format(value),
    date: value => day.format(value * 1000),
  };
}

/**
 * What the player's own average is called. Lichess translates no plain
 * "average" of its own, so it's ours, in the two languages the coach speaks.
 */
export const averageWord = (): string => (isFrench() ? 'Moyenne' : 'Average');

/** A text category reads as it is; a date's seconds become a day. */
export const categoryLabel =
  (formats: Formats) =>
  (category: string | number): string =>
    typeof category === 'number' ? formats.date(category) : category;
