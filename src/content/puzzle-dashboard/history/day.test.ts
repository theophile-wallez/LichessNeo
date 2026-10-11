import { describe, expect, it } from 'vitest';
import { dayHeading, daysBefore } from './day.ts';

// A Monday, at noon on the device's clock.
const NOW = new Date(2026, 9, 12, 12);
const at = (month: number, day: number, hour = 12, year = 2026): Date =>
  new Date(year, month, day, hour);

const heading = (date: Date, locale: string): string => dayHeading(date, NOW, locale);

describe('a session’s day', () => {
  it('counts by the calendar, not by the hours', () => {
    expect(daysBefore(at(9, 11, 23), NOW)).toBe(1);
    expect(daysBefore(at(9, 12, 0), NOW)).toBe(0);
    expect(daysBefore(at(8, 30), NOW)).toBe(12);
  });

  it('is today, yesterday, a weekday, then a month, its year if not this one', () => {
    expect(heading(at(9, 12, 1), 'en')).toBe('Today');
    expect(heading(at(9, 11, 23), 'en')).toBe('Yesterday');
    expect(heading(at(9, 9), 'en')).toBe('Friday');
    expect(heading(at(9, 5), 'en')).toBe('October');
    expect(heading(at(7, 20, 12, 2025), 'en')).toBe('August 2025');
    expect(heading(at(9, 11), 'fr')).toBe('Hier');
    expect(heading(at(9, 9), 'fr')).toBe('Vendredi');
  });

  it('is today for a time a little ahead of the device’s clock', () => {
    expect(dayHeading(at(9, 13, 0), NOW, 'en')).toBe('Today');
  });
});
