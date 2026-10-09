import { describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { clockTime } from '#shared/clock-time.ts';
import { moveTimesMarkup, timeShare } from './move-times.ts';
import type { MoveTime } from './series.ts';

const NAMES = { middlegame: 'Middlegame', endgame: 'Endgame' };

describe('the move times', () => {
  it('scale a column on a log, the longest move filling its half', () => {
    expect(timeShare(60, 60)).toBe(1);
    expect(timeShare(0, 60)).toBe(0);
    // A second still shows next to a minute.
    expect(timeShare(1, 60)).toBeGreaterThan(0.02);
    expect(timeShare(5, 0)).toBe(0);
  });

  it('write a clock as Lichess does', () => {
    expect(clockTime(125.4)).toBe('2:05');
    expect(clockTime(3725)).toBe('1:02:05');
    expect(clockTime(-1)).toBe('0:00');
  });

  it('put White’s columns above the middle and Black’s below', () => {
    const times: MoveTime[] = [
      { ply: 1, color: 'white', san: '1. e4', seconds: 10, clock: null },
      { ply: 2, color: 'black', san: '1... e5', seconds: 10, clock: null },
    ];
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    setHtml(
      root,
      moveTimesMarkup(
        { times, lastPly: 2, phases: { middle: null, end: null }, names: NAMES },
        { width: 200, height: 118 },
      ),
    );
    const [white, black] = [...root.querySelectorAll('.lr-ext-gchart__bar')];
    const middle = 18 + 50;
    expect(Number(white?.getAttribute('y')) + Number(white?.getAttribute('height'))).toBe(middle);
    expect(Number(black?.getAttribute('y'))).toBe(middle);
  });
});
