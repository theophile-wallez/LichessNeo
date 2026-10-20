import { describe, expect, it } from 'vitest';
import { checkmate } from '#shared/chess/mate.ts';
import { setHtml } from '#shared/html.ts';
import { LegacySchema } from './fixtures/schema.ts';
import { arrowOutline, arrowPath, squareCenter, squareOnScreen } from './geometry.ts';
import { arrowsMarkup, fillsMarkup } from './render.ts';
// What the original script drew.
import legacyJson from './fixtures/legacy.json' with { type: 'json' };

const legacy = LegacySchema.parse(legacyJson);

// Parsed, so both sides serialize alike (`<path/>` becomes `<path></path>`).
function parsed(markup: string): string {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host.innerHTML;
}

describe('arrowOutline', () => {
  it.each(legacy.polygons)('draws $points as the original did', ({ points, polygon }) => {
    const [from, second, third] = points;
    if (!from || !second) throw new Error('an arrow needs two points');
    const path = third ? { from, corner: second, tip: third } : { from, tip: second };
    expect(arrowOutline(path)).toBe(polygon);
  });
});

describe('arrowPath', () => {
  it('bends knight moves along their long leg first', () => {
    expect(arrowPath([6.5, 7.5], [5.5, 5.5])).toEqual({
      from: [6.5, 7.5],
      corner: [6.5, 5.5],
      tip: [5.5, 5.5],
    });
    expect(arrowPath([1.5, 1.5], [3.5, 2.5])).toEqual({
      from: [1.5, 1.5],
      corner: [3.5, 1.5],
      tip: [3.5, 2.5],
    });
    expect(arrowPath([4.5, 6.5], [4.5, 4.5])).toEqual({ from: [4.5, 6.5], tip: [4.5, 4.5] });
  });
});

describe('arrowsMarkup', () => {
  it.each(legacy.arrows)('draws $from to $to as the original did', ({ from, to, markup }) => {
    const host = document.createElement('div');
    setHtml(host, arrowsMarkup([{ from, to, color: '255,170,0', opacity: 0.8 }]));
    expect(host.innerHTML).toBe(
      parsed(`<svg class="ln-ext-shapes__arrows" viewBox="0 0 8 8">${markup}</svg>`),
    );
  });

  it('draws nothing without arrows', () => {
    expect(arrowsMarkup([]).value).toBe('');
    expect(fillsMarkup([]).value).toBe('');
  });
});

describe('squareCenter', () => {
  it.each(legacy.centers)(
    'places $square as the original did (white at the bottom: $white)',
    ({ square, white, center }) => {
      expect(squareCenter(square, white)).toEqual(center);
    },
  );
});

describe('squareOnScreen', () => {
  it('counts columns and rows from the top left as shown', () => {
    expect(squareOnScreen('a1', true)).toEqual([0, 7]);
    expect(squareOnScreen('a1', false)).toEqual([7, 0]);
    expect(squareOnScreen('h8', true)).toEqual([7, 0]);
    expect(squareOnScreen('c6', false)).toEqual([5, 5]);
  });

  it.each(legacy.centers)(
    'puts $square half a square before its center (white at the bottom: $white)',
    ({ square, white, center }) => {
      expect(squareOnScreen(square, white)).toEqual([center[0] - 0.5, center[1] - 0.5]);
    },
  );
});

describe('checkmate', () => {
  it.each(
    legacy.nodes.map(({ node, king }) => ({
      node,
      king,
      san: node.san ?? 'no move',
      fen: node.fen,
    })),
  )('finds $king after $san in $fen, as the original did', ({ node, king }) => {
    expect(checkmate(node)?.king ?? null).toBe(king);
  });

  it('needs a node', () => {
    expect(checkmate(null)).toBeNull();
  });
});
