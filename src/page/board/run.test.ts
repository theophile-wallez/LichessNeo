import { describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { PLAN_COLOR } from './colors.ts';
import type { Mark } from './review-arrows.ts';
import { runMarkup } from './run.ts';

type Run = Extract<Mark, { readonly kind: 'run' }>;

const lanes = (run: Run, whiteAtBottom = true): Element[] => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  setHtml(element, runMarkup(run, PLAN_COLOR, whiteAtBottom));
  return [...element.querySelectorAll('.ln-ext-drawing__lane')];
};

const box = (lane: Element | undefined): (string | null | undefined)[] =>
  ['x', 'y', 'width', 'height'].map(name => lane?.getAttribute(name));

const ROOK_FILE: Run = {
  kind: 'run',
  from: 'b7',
  squares: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b8'],
  tone: 'plan',
};

const PAWN_ROAD: Run = { kind: 'run', from: 'b6', squares: ['b7', 'b8'], tone: 'plan' };

describe('runMarkup', () => {
  it('draws nothing of a run without squares', () => {
    expect(runMarkup({ ...PAWN_ROAD, squares: [] }, PLAN_COLOR, true).value).toBe('');
  });

  it('covers a pawn’s road with one pill, inside the squares’ edges', () => {
    const [lane, ...rest] = lanes(PAWN_ROAD);
    expect(rest).toEqual([]);
    expect(box(lane)).toEqual(['1.1', '0.1', '0.8', '1.8']);
    expect(lane?.getAttribute('stroke')).toBe(`rgba(${PLAN_COLOR},0.9)`);
  });

  it('draws a pill on each side of a piece in the middle of its line, leaving its square', () => {
    expect(lanes(ROOK_FILE).map(box)).toEqual([
      ['1.1', '0.1', '0.8', '0.8'],
      ['1.1', '2.1', '0.8', '5.8'],
    ]);
  });

  it('stretches each pill out from the piece', () => {
    const styles = lanes(ROOK_FILE).map(lane => lane.getAttribute('style'));
    expect(styles).toEqual([
      '--ln-ext-origin:50% 100%;--ln-ext-from:1 0;--ln-ext-run:0.240s',
      '--ln-ext-origin:50% 0%;--ln-ext-from:1 0;--ln-ext-run:0.240s',
    ]);
  });

  it('stretches along a rank from the piece’s side', () => {
    const [lane] = lanes({ kind: 'run', from: 'a1', squares: ['b1', 'c1', 'd1'], tone: 'plan' });
    expect(lane?.getAttribute('style')).toContain('--ln-ext-origin:0% 50%;--ln-ext-from:0 1');
  });

  it('runs the other way on a board seen from Black', () => {
    const [lane] = lanes(PAWN_ROAD, false);
    expect(box(lane)).toEqual(['6.1', '6.1', '0.8', '1.8']);
    expect(lane?.getAttribute('style')).toContain('--ln-ext-origin:50% 0%');
  });
});
