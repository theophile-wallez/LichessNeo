// The day a session was played, as the history's headings say it, in the
// page's language: today, yesterday, a weekday within the week, then its month.

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;

const midnight = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Whole days from `date` to `now`, by the calendar: yesterday at 23:59 is one. */
export const daysBefore = (date: Date, now: Date): number =>
  Math.round((midnight(now) - midnight(date)) / DAY_MS);

const capitalized = (text: string, locale: string | undefined): string =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** "Today", "yesterday", the weekday, or the month (with its year if not this one). */
export function dayName(date: Date, now: Date, locale?: string): string {
  // A time a little ahead of the device's clock is still today.
  const days = Math.max(0, daysBefore(date, now));
  if (days < 2)
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  if (days < WEEK_DAYS) return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const year = date.getFullYear() === now.getFullYear() ? undefined : 'numeric';
  return new Intl.DateTimeFormat(locale, { month: 'long', year }).format(date);
}

/** The heading over a day's sessions: `dayName`, starting with a capital. */
export const dayHeading = (date: Date, now: Date, locale?: string): string =>
  capitalized(dayName(date, now, locale), locale);
