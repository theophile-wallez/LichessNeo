import { describe, expect, it } from 'vitest';
import type { Point } from '#shared/geometry.ts';
import { gameRatingColor, seriesColor } from './colors.ts';
import { monotoneCurve } from './curve.ts';
import { chipLabel, gridLine, tipRow } from './markup.ts';
import { steps } from './steps.ts';
import { tipLeft } from './tooltip.ts';
// The curve as each original script (before the TypeScript port) drew it.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const points = (list: readonly number[][]): Point[] => list.map(([x = 0, y = 0]) => [x, y]);

describe('monotoneCurve', () => {
  it.each(
    [...legacy.ratingChart, ...legacy.distribution].map(({ points, output }) => [points, output]),
  )('draws %j as the original did', (list, output) => {
    expect(monotoneCurve(points(list))).toBe(output);
  });

  it('stays flat where the points turn', () => {
    // From (0,0) up to (10,10) then down: the tangent at the peak is flat.
    expect(
      monotoneCurve([
        [0, 0],
        [10, 10],
        [20, 0],
      ]),
    ).toBe('M0,0C3.3,3.3,6.7,10,10,10C13.3,10,16.7,3.3,20,0');
  });

  it('draws nothing without a point', () => {
    expect(monotoneCurve([])).toBe('');
  });
});

describe('steps', () => {
  it('counts from one end to the other, fractional steps drifting like a loop', () => {
    expect(steps(0, 10, 5)).toEqual([0, 5, 10]);
    expect(steps(0, 0.3, 0.1)).toEqual([0, 0.1, 0.2]);
  });
});

describe('colors', () => {
  it('gives the series their color by position, puzzles last', () => {
    expect(seriesColor(2)).toBe('#45a3f5');
    expect(seriesColor(14)).toBe('#f06a4a');
    expect(seriesColor(15)).toBe(seriesColor(0));
  });

  it('gives a game rating its color by key, Blitz when unknown', () => {
    expect(gameRatingColor('rapid')).toBe('#81b64c');
    expect(gameRatingColor('racingKings')).toBe('#67e8f9');
    expect(gameRatingColor('puzzle')).toBe('#45a3f5');
    expect(gameRatingColor('constructor')).toBe('#45a3f5');
    expect(gameRatingColor(undefined)).toBe('#45a3f5');
  });
});

describe('the tooltip', () => {
  it('goes right of the anchor, or left when it would pass the limit', () => {
    expect(tipLeft({ anchor: 100, width: 50, gap: 10, limit: 200 })).toBe(110);
    expect(tipLeft({ anchor: 150, width: 50, gap: 10, limit: 200 })).toBe(90);
  });
});

describe('markup', () => {
  it('escapes names', () => {
    expect(chipLabel('<b>').value).toBe(
      '<span class="lr-ext-rchart__swatch"></span><span class="lr-ext-rchart__name">&lt;b&gt;</span>',
    );
    expect(tipRow({ color: '#fff', name: 'A & B', value: 3 }).value).toContain(
      '<span>A &amp; B</span>',
    );
  });

  it('puts the grid label 10px left of the line', () => {
    expect(gridLine({ y: 5, left: 46, right: 626, label: 1500 }).value).toBe(
      '<line class="lr-ext-rchart__grid" x1="46" x2="626" y1="5" y2="5"/><text class="lr-ext-rchart__ylabel" x="36" y="5">1500</text>',
    );
  });
});
