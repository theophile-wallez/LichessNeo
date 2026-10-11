import { describe, expect, it } from 'vitest';
import { coachWord, tierOf, type Week } from './coach-word.ts';

const NOW = new Date(2026, 9, 12, 12);
const WEEK: Week = { puzzles: 10, firstWins: 5, toReplay: 3 };

// Each line as its message's name, then what fills it in.
const said = (week: Week, run: Parameters<typeof coachWord>[1] = null): string[] =>
  coachWord(week, run, NOW, 'en').lines.map(({ name, values }) => [name, ...values].join(':'));

describe('the coach’s word on the week', () => {
  it('colors the week by its share solved first try', () => {
    expect(tierOf(0.65)).toBe('up');
    expect(tierOf(0.5)).toBe('even');
    expect(tierOf(0.4)).toBe('down');
    expect(coachWord({ ...WEEK, firstWins: 8 }, null, NOW).mood).toBe('delight');
    expect(coachWord({ ...WEEK, firstWins: 2 }, null, NOW)).toMatchObject({
      mood: 'worry',
      tier: 'down',
    });
  });

  it('says how the week went, then what’s left to retry', () => {
    expect(said({ ...WEEK, firstWins: 8 })).toEqual(['phistSharp', 'phistMissedMany:3']);
    expect(said({ ...WEEK, toReplay: 1 })).toEqual(['phistSteady', 'phistMissedOne']);
    expect(said({ ...WEEK, firstWins: 2, toReplay: 0 })).toEqual(['phistTough', 'phistAllClear']);
  });

  it('leads with a run of three or more, and its day', () => {
    const today = { length: 4, at: new Date(2026, 9, 12, 9) };
    expect(said(WEEK, today)[0]).toBe('phistRunDay:4:today');
    const friday = { length: 3, at: new Date(2026, 9, 9) };
    expect(said(WEEK, friday)[0]).toBe('phistRunOn:3:Friday');
    expect(said(WEEK, { ...today, length: 2 })[0]).toBe('phistSteady');
  });

  it('asks for a first puzzle after an empty week', () => {
    expect(coachWord({ puzzles: 0, firstWins: 0, toReplay: 0 }, null, NOW)).toEqual({
      lines: [
        { name: 'phistNone', values: [] },
        { name: 'phistNoneBody', values: [] },
      ],
      mood: 'neutral',
      tier: 'even',
    });
  });
});
