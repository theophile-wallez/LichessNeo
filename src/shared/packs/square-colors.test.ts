import { describe, expect, it } from 'vitest';
import { squareColors } from './square-colors.ts';

/** A board of `size` pixels a side, each square's middle in its color and its edges in red. */
function board(size: number, light: number[], dark: number[]): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const square = size / 8;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const edge = x % square < 2 || y % square < 2;
      const isLight = (Math.floor(x / square) + Math.floor(y / square)) % 2 === 0;
      const middle = isLight ? light : dark;
      pixels.set([...(edge ? [255, 0, 0] : middle), 255], (y * size + x) * 4);
    }
  return pixels;
}

describe('squareColors', () => {
  it("reads the light and dark squares' colors from their middles", () => {
    expect(squareColors(board(64, [242, 228, 204], [196, 147, 106]), 64)).toEqual({
      light: '#f2e4cc',
      dark: '#c4936a',
    });
  });
});
