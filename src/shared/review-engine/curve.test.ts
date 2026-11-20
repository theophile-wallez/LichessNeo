import { describe, expect, it } from 'vitest';
import { nearly } from '#shared/testing/numbers.ts';
import { type CurveState, EngineCurve } from './curve.ts';
import { tierOf } from './options.ts';

// Log seconds from depth 8 to 28, rising.
const main = Array.from({ length: 21 }, (_, i) => i * 0.4);
const other = Array.from({ length: 21 }, (_, i) => i * 0.45);
const STOPS = ['Fast', 'Standard', 'Deep', 'Maximum'].map(name => ({ name, time: '1 min' }));

const stateAt = (depth: number): CurveState => ({
  main,
  other,
  depth,
  tier: tierOf(depth),
  stops: STOPS,
});

function curve(big: boolean): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const engineCurve = new EngineCurve(svg, { big, locale: 'en', defaultName: 'Default' });
  engineCurve.show(stateAt(20), true);
  return svg;
}

/** Where a depth stands across the 330px the curve takes without a width of its own. */
const xOf = (depth: number): number => 9 + ((depth - 8) / 20) * (330 - 18);

const dotX = (svg: SVGSVGElement): number =>
  Number(svg.querySelector('.ln-ext-engine-curve__dot')?.getAttribute('cx'));

const labels = (svg: SVGSVGElement): (string | null)[] =>
  Array.from(svg.querySelectorAll('.ln-ext-engine-curve__label'), label => label.textContent);

describe('EngineCurve', () => {
  it('marks the default depth on the popover', () => {
    const svg = curve(false);
    const mark = svg.querySelector('.ln-ext-engine-curve__default');
    expect(mark?.querySelector('text')?.textContent).toBe('Default');
    expect(Number(mark?.querySelector('line')?.getAttribute('x1'))).toEqual(nearly(xOf(16)));
  });

  it('names the levels on the big one, and marks no default there', () => {
    const svg = curve(true);
    expect(svg.querySelector('.ln-ext-engine-curve__default')).toBeNull();
    const stops = Array.from(svg.querySelectorAll('.ln-ext-engine-curve__stop'));
    expect(
      stops.map(stop => stop.querySelector('.ln-ext-engine-curve__name')?.textContent),
    ).toEqual(['Fast', 'Standard', 'Deep', 'Maximum']);
    expect(stops.map(stop => stop.classList.contains('ln-ext-on'))).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it('grids the hour on the big one only', () => {
    expect(labels(curve(false))).toEqual(['10s', '1m', '10m']);
    expect(labels(curve(true))).toEqual(['10s', '1m', '10m', '1h']);
  });

  it('puts the dot at the depth, and keeps it at the end past the curve', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const engineCurve = new EngineCurve(svg, { big: false, locale: 'en', defaultName: '' });
    engineCurve.show(stateAt(12), true);
    expect(dotX(svg)).toEqual(nearly(xOf(12)));
    engineCurve.show(stateAt(35), true);
    expect(dotX(svg)).toEqual(nearly(xOf(28)));
  });
});
