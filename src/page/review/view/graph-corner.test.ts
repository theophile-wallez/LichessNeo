import { describe, expect, it } from 'vitest';
import { type Span, toggleCorner } from './graph-corner.ts';

// A 300×100 graph, the toggle 150×26 six pixels in from its corner.
const BOX = { width: 150, height: 26, inset: 6, graphHeight: 100 };

const flat = (y: number, from = 0, to = 300): Span[] =>
  Array.from({ length: (to - from) / 10 }, (_, i) => ({ x: from + i * 10, top: y, bottom: y }));

describe('toggleCorner', () => {
  it('stays at the top while the curve runs below it', () => {
    expect(toggleCorner(flat(50), BOX)).toBe('top');
  });

  it('goes down when White leads from the start, the curve high on the left', () => {
    expect(toggleCorner([...flat(15, 0, 160), ...flat(60, 160)], BOX)).toBe('bottom');
  });

  it('heeds only what runs under it: a rise past its right side leaves it at the top', () => {
    expect(toggleCorner([...flat(50, 0, 200), ...flat(10, 200)], BOX)).toBe('top');
  });

  it('stays at the top when the bottom is no clearer', () => {
    const columns = Array.from({ length: 16 }, (_, i) => ({ x: i * 10, top: 0, bottom: 100 }));
    expect(toggleCorner(columns, BOX)).toBe('top');
  });
});
