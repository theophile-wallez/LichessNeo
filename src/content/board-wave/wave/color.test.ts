import { describe, expect, it } from 'vitest';
import { oklab, parseHex, singlePalette } from './color.ts';

describe('the wave’s colours', () => {
  it('read a colour written as #rrggbb, and nothing else', () => {
    expect(parseHex('#5e6ad2')).toEqual([94, 106, 210]);
    expect(parseHex('#5E6AD2')).toEqual([94, 106, 210]);
    expect(parseHex('#5e6')).toBeNull();
    expect(parseHex('oklch(60% 0.1 270)')).toBeNull();
  });

  it('make one colour a palette, lighter ahead of the front and deeper behind', () => {
    const palette = singlePalette([100, 100, 100]);
    expect(palette.colors[0]).toEqual([100, 100, 100]);
    expect(palette.ahead[0]).toBeGreaterThan(100);
    expect(palette.behind[0]).toBeLessThan(100);
  });

  it('turn sRGB into Oklab', () => {
    const [lightness, greenRed, blueYellow] = oklab([255, 255, 255]);
    expect(lightness).toBeCloseTo(1, 4);
    expect(Math.abs(greenRed) + Math.abs(blueYellow)).toBeLessThan(1e-4);
    expect(oklab([0, 0, 0])[0]).toBe(0);
    // Red leans to red on the green-red axis.
    expect(oklab([255, 0, 0])[1]).toBeGreaterThan(0.2);
  });
});
