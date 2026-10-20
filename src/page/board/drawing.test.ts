import { describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { PLAN_COLOR, REVIEW_COLOR, THREAT_COLOR } from './colors.ts';
import { clearOfArrows, drawingMarkup } from './drawing.ts';
import type { Mark } from './review-arrows.ts';

const svg = (marks: readonly Mark[], whiteAtBottom = true): SVGElement => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  setHtml(element, drawingMarkup(marks, whiteAtBottom));
  return element;
};

/** Each layer's strokes, by their class. */
const layers = (element: SVGElement): string[][] =>
  [...element.querySelectorAll('.ln-ext-drawing__layer')].map(layer =>
    [...layer.children].map(stroke => stroke.getAttribute('class') ?? ''),
  );

describe('drawingMarkup', () => {
  it('draws nothing of no marks', () => {
    expect(drawingMarkup([], true).value).toBe('');
  });

  it('layers the strokes by kind, the rings over the lines they end on', () => {
    const drawn = svg([
      { kind: 'ring', square: 'e5', tone: 'attack' },
      { kind: 'link', from: 'b2', to: 'e5', tone: 'attack' },
      { kind: 'barred', square: 'f8', tone: 'attack' },
      { kind: 'cells', squares: ['b7', 'b8'], tone: 'plan' },
      { kind: 'area', from: 'a5', to: 'd8' },
    ]);
    expect(layers(drawn)).toEqual([
      ['ln-ext-drawing__area'],
      ['ln-ext-drawing__cell', 'ln-ext-drawing__cell'],
      ['ln-ext-drawing__link'],
      ['ln-ext-drawing__barred'],
      ['ln-ext-drawing__ring'],
    ]);
  });

  it('steps through the layers drawn only, one after the other', () => {
    const drawn = svg([
      { kind: 'ring', square: 'e5', tone: 'plan' },
      { kind: 'link', from: 'b2', to: 'e5', tone: 'attack' },
    ]);
    const steps = [...drawn.querySelectorAll('.ln-ext-drawing__layer')].map(layer =>
      layer.getAttribute('style'),
    );
    expect(steps).toEqual(['--ln-ext-step:0', '--ln-ext-step:1']);
  });

  it('draws the area still, from corner to corner, on either side of the board', () => {
    const area = svg([{ kind: 'area', from: 'a5', to: 'd8' }]).querySelector('rect');
    expect(['x', 'y', 'width', 'height'].map(name => area?.getAttribute(name))).toEqual([
      '0.04',
      '0.04',
      '3.92',
      '3.92',
    ]);
    expect(area?.hasAttribute('style')).toBe(false);
    expect(area?.outerHTML).not.toMatch(/transform-origin|animation/);
    const flipped = svg([{ kind: 'area', from: 'a5', to: 'd8' }], false).querySelector('rect');
    expect([flipped?.getAttribute('x'), flipped?.getAttribute('y')]).toEqual(['4.04', '4.04']);
  });

  it('colors each stroke by its tone', () => {
    const drawn = svg([
      { kind: 'ring', square: 'a1', tone: 'attack' },
      { kind: 'ring', square: 'b1', tone: 'defense' },
      { kind: 'ring', square: 'c1', tone: 'plan' },
    ]);
    const strokes = [...drawn.querySelectorAll('.ln-ext-drawing__ring')].map(ring =>
      ring.getAttribute('stroke'),
    );
    expect(strokes).toEqual([`rgb(${THREAT_COLOR})`, `rgb(${REVIEW_COLOR})`, `rgb(${PLAN_COLOR})`]);
  });
});

describe('the coach’s boxes', () => {
  it('draws a square’s box on its edges, square-cornered', () => {
    const box = svg([{ kind: 'ring', square: 'b2', tone: 'attack' }]).querySelector('rect');
    const geometry = ['x', 'y', 'width', 'height', 'stroke-width'].map(name =>
      Number(box?.getAttribute(name)),
    );
    expect(geometry).toEqual([1.04, 6.04, 0.92, 0.92, 0.08]);
    expect(box?.hasAttribute('rx')).toBe(false);
  });
});

describe('the squares a mate bars', () => {
  it('stripes the whole square, each with its own pattern in the tone’s color', () => {
    const drawn = svg([
      { kind: 'barred', square: 'g8', tone: 'attack' },
      { kind: 'barred', square: 'h8', tone: 'attack' },
    ]);
    const squares = [...drawn.querySelectorAll('.ln-ext-drawing__barred > rect')];
    expect(
      squares.map(square => ['x', 'y', 'width'].map(name => square.getAttribute(name))),
    ).toEqual([
      ['6', '0', '1'],
      ['7', '0', '1'],
    ]);
    const patterns = [...drawn.querySelectorAll('pattern')];
    expect(squares.map(square => square.getAttribute('fill'))).toEqual(
      patterns.map(pattern => `url(#${pattern.id})`),
    );
    expect(new Set(patterns.map(pattern => pattern.id)).size).toBe(2);
    expect(patterns[0]?.querySelector('rect')?.getAttribute('fill')).toBe(
      `rgba(${THREAT_COLOR},0.8)`,
    );
  });
});

describe('the coach’s lines', () => {
  it('draws a line as dots, drawn in from its start under a mask', () => {
    const link = svg([{ kind: 'link', from: 'b2', to: 'e5', tone: 'attack' }]).querySelector(
      '.ln-ext-drawing__link',
    );
    const reveal = link?.querySelector('mask .ln-ext-drawing__reveal');
    const dots = link?.querySelector(':scope > line');
    expect(reveal?.getAttribute('pathLength')).toBe('1');
    expect(reveal?.getAttribute('stroke-linecap')).toBe('round');
    expect(dots?.getAttribute('mask')).toBe(`url(#${link?.querySelector('mask')?.id})`);
    expect(dots?.getAttribute('stroke-dasharray')).toBe('0.001 0.24');
    expect(dots?.getAttribute('stroke')).toBe(`rgb(${THREAT_COLOR})`);
  });

  it('gives each line a mask of its own', () => {
    const drawn = svg([
      { kind: 'link', from: 'b2', to: 'e5', tone: 'attack' },
      { kind: 'link', from: 'b2', to: 'b7', tone: 'defense' },
    ]);
    const ids = [...drawn.querySelectorAll('mask')].map(mask => mask.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('leaves out a line an arrow already draws, from its start the same way', () => {
    const marks: Mark[] = [
      { kind: 'link', from: 'g6', to: 'f5', tone: 'attack' },
      { kind: 'link', from: 'e4', to: 'a8', tone: 'attack' },
      { kind: 'link', from: 'd1', to: 'd4', tone: 'defense' },
      { kind: 'link', from: 'd1', to: 'd2', tone: 'defense' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ];
    const arrows = [
      { orig: 'g6', dest: 'f5', brush: 'threat' },
      { orig: 'd1', dest: 'd8', brush: 'best' },
      { orig: 'e4', dest: 'h7', brush: 'best' },
    ] as const;
    expect(clearOfArrows(marks, arrows)).toEqual([
      { kind: 'link', from: 'e4', to: 'a8', tone: 'attack' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });
});
