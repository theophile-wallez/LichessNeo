import { describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { RUN_COLOR, RUN_END_COLOR } from './colors.ts';
import type { Mark } from './review-arrows.ts';
import { runMarkup } from './run.ts';

type Run = Extract<Mark, { readonly kind: 'run' }>;

const svg = (run: Run, whiteAtBottom = true): SVGElement => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  setHtml(element, runMarkup(run, whiteAtBottom, 3));
  return element;
};

const ROOK_FILE: Run = {
  kind: 'run',
  from: 'b7',
  squares: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b8'],
  tone: 'plan',
};

const PAWN_ROAD: Run = { kind: 'run', from: 'b6', squares: ['b7', 'b8'], tone: 'plan' };

const stops = (element: SVGElement): [string | null, string | null][] =>
  [...element.querySelectorAll('stop')].map(stop => [
    stop.getAttribute('offset'),
    stop.getAttribute('stop-color'),
  ]);

const knobs = (element: SVGElement): (string | null)[] =>
  [...element.querySelectorAll('.ln-ext-drawing__knob')].map(
    knob => knob.parentElement?.getAttribute('style') ?? null,
  );

const litTimes = (element: SVGElement): number[] =>
  [...element.querySelectorAll('.ln-ext-drawing__notch')].map(notch =>
    Number.parseFloat(notch.getAttribute('style')?.replace('--ln-ext-lit:', '') ?? ''),
  );

describe('runMarkup', () => {
  it('draws nothing of a run without squares', () => {
    expect(runMarkup({ ...PAWN_ROAD, squares: [] }, true, 0).value).toBe('');
  });

  it('sends a knob each way from a piece in the middle of its line, to the line’s ends', () => {
    const drawn = svg(ROOK_FILE);
    expect(knobs(drawn)).toEqual([
      '--ln-ext-run:0.220s;--ln-ext-dx:0px;--ln-ext-dy:-1px',
      '--ln-ext-run:0.360s;--ln-ext-dx:0px;--ln-ext-dy:6px',
    ]);
    const rail = drawn.querySelector('.ln-ext-drawing__rail line');
    expect([rail?.getAttribute('y1'), rail?.getAttribute('y2')]).toEqual(['0.5', '7.5']);
    expect(drawn.querySelectorAll('.ln-ext-drawing__notch')).toHaveLength(7);
  });

  it('shades the whole line with one gradient, blue at the piece and purple at both ends', () => {
    const drawn = svg(ROOK_FILE);
    expect(stops(drawn)).toEqual([
      ['0', `rgb(${RUN_END_COLOR})`],
      ['0.143', `rgb(${RUN_COLOR})`],
      ['1', `rgb(${RUN_END_COLOR})`],
    ]);
    const paints = [
      ...[...drawn.querySelectorAll('.ln-ext-drawing__fill')].map(fill =>
        fill.getAttribute('stroke'),
      ),
      ...[...drawn.querySelectorAll('.ln-ext-drawing__notch')].map(notch =>
        notch.getAttribute('fill'),
      ),
    ];
    expect(new Set(paints)).toEqual(new Set(['url(#ln-ext-drawing-run-3)']));
  });

  it('keeps the blue at the piece on a line that runs one way only', () => {
    expect(stops(svg(PAWN_ROAD))).toEqual([
      ['0', `rgb(${RUN_END_COLOR})`],
      ['1.000', `rgb(${RUN_COLOR})`],
      ['1', `rgb(${RUN_COLOR})`],
    ]);
  });

  it('lights the notches in turn as the knob reaches them, the last one before it stops', () => {
    const times = litTimes(svg({ ...ROOK_FILE, squares: ['b6', 'b5', 'b4', 'b3', 'b2', 'b1'] }));
    expect(times).toEqual(times.toSorted((first, second) => first - second));
    expect(new Set(times).size).toBe(times.length);
    expect(times.at(-1)).toBeLessThan(0.36);
  });

  it('runs the other way on a board seen from Black', () => {
    expect(knobs(svg(PAWN_ROAD, false))).toEqual([
      '--ln-ext-run:0.220s;--ln-ext-dx:0px;--ln-ext-dy:2px',
    ]);
  });
});
