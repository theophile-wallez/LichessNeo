import { describe, expect, it } from 'vitest';
import { formatMinutes, formatSeconds, hostStart, hostTime, timeControl } from './clock.ts';

const CLOCK = { minutes: 20, increment: 60, hostExtra: 10, hostPerPlayer: 30 };

describe('a simul’s clock', () => {
  it('reads as Lichess writes it on a simul’s card', () => {
    expect(timeControl(CLOCK)).toBe('20+60');
  });

  it('gives the host their extra time at the start', () => {
    expect(hostStart(CLOCK)).toBe(30);
  });

  // Lichess offers down to -120 minutes for a host who wants less time.
  it('never starts the host below zero', () => {
    expect(hostStart({ ...CLOCK, hostExtra: -30 })).toBe(0);
  });

  it('adds the host’s time for each player who joins', () => {
    expect(hostTime(CLOCK, 30)).toBe(45);
    expect(hostTime({ ...CLOCK, hostPerPlayer: 0 }, 30)).toBe(30);
  });

  it('writes minutes and seconds short, a fraction to one place', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(22.5)).toBe('22.5 min');
    expect(formatSeconds(30)).toBe('30 sec');
  });
});
