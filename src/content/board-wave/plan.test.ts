import { describe, expect, it } from 'vitest';
import { endPlan, startPlan, winPalette } from './plan.ts';
import { PALETTES, singlePalette } from './wave/color.ts';

const SQUARE = 1 / 8;

describe('the wave at a game’s end', () => {
  it('rings out of the square the game ended on, as the board is turned', () => {
    // The mated king on g8, seen from White, then from Black.
    expect(endPlan({ result: 'win', square: 'g8' }, 'white').source).toEqual({
      x: 6 * SQUARE,
      y: 0,
      width: SQUARE,
      height: SQUARE,
    });
    expect(endPlan({ result: 'win', square: 'g8' }, 'black').source).toEqual({
      x: SQUARE,
      y: 7 * SQUARE,
      width: SQUARE,
      height: SQUARE,
    });
    expect(endPlan({ result: 'loss', square: 'e4' }, 'white').type).toBe('center');
  });

  it('rings out of the board’s centre for a draw, or a game without a move', () => {
    const centre = { x: 3.5 * SQUARE, y: 3.5 * SQUARE, width: SQUARE, height: SQUARE };
    expect(endPlan({ result: 'draw', square: 'a1' }, 'white').source).toEqual(centre);
    expect(endPlan({ result: 'win', square: null }, 'white').source).toEqual(centre);
  });

  it('takes the result’s colour, a loss’s quieter', () => {
    expect(endPlan({ result: 'win', square: 'e8' }, 'white').palette).toBe(PALETTES.colorful);
    expect(endPlan({ result: 'draw', square: null }, 'white').palette).toBe(PALETTES.mono);
    const loss = endPlan({ result: 'loss', square: 'e1' }, 'white');
    expect(loss.palette).toEqual(singlePalette([179, 58, 76]));
    expect(loss.changes).toMatchObject({ strength: 0.5, rimStrength: 0.5 });
    expect(endPlan({ result: 'win', square: 'e8' }, 'white').changes).toEqual({});
  });
});

describe('a win’s colours', () => {
  it('are a palette of the wave’s, or the theme’s accent, and colour a win alone', () => {
    expect(winPalette('rainbow', null)).toBe(PALETTES.colorful);
    expect(winPalette('ocean', null)).toBe(PALETTES.ocean);
    expect(winPalette('accent', [10, 20, 30])).toEqual(singlePalette([10, 20, 30]));
    // Unread, the accent is ours.
    expect(winPalette('accent', null)).toEqual(singlePalette([58, 111, 216]));
    const sunset = winPalette('sunset', null);
    expect(endPlan({ result: 'win', square: 'e8' }, 'white', sunset).palette).toBe(sunset);
    expect(endPlan({ result: 'draw', square: null }, 'white', sunset).palette).toBe(PALETTES.mono);
  });
});

describe('the wave at a game’s start', () => {
  it('runs up from the bottom edge, the player’s side, in the theme’s accent', () => {
    const plan = startPlan([94, 106, 210]);
    expect(plan.type).toBe('vertical');
    expect(plan.source.y + plan.source.height).toBeGreaterThan(1);
    expect(plan.palette).toEqual(singlePalette([94, 106, 210]));
  });

  it('takes our blue where the accent can’t be read', () => {
    expect(startPlan(null).palette).toEqual(singlePalette([58, 111, 216]));
  });
});
