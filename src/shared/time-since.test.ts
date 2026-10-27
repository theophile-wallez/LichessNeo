import { describe, expect, it } from 'vitest';
import { timeSince } from './time-since.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('how long ago', () => {
  const now = Date.UTC(2026, 9, 22, 12);

  it('is said in the largest unit that counts at least one', () => {
    expect(timeSince(now - 3 * HOUR, now)).toEqual({ value: -3, unit: 'hour' });
    expect(timeSince(now - 40 * DAY, now)).toEqual({ value: -1, unit: 'month' });
    expect(timeSince(now - 800 * DAY, now)).toEqual({ value: -2, unit: 'year' });
  });

  it('is a minute at the least, for seconds ago or in the future', () => {
    expect(timeSince(now - 10_000, now)).toEqual({ value: -1, unit: 'minute' });
    expect(timeSince(now + HOUR, now)).toEqual({ value: -1, unit: 'minute' });
  });
});
