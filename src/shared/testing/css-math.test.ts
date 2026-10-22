import { describe, expect, it } from 'vitest';
import { cssPixels, cssTracks } from './css-math.ts';

const WINDOW = { width: 1440, height: 780 };

describe('a CSS length', () => {
  it('reads a window’s units', () => {
    expect(cssPixels('14vw', WINDOW)).toBeCloseTo(201.6, 6);
    expect(cssPixels('50dvh', WINDOW)).toBe(390);
  });

  it('works a calc out as a browser does', () => {
    expect(cssPixels('calc(100vw - 168px)', WINDOW)).toBe(1272);
    expect(cssPixels('calc(2 * (10px + 5px) / 3)', WINDOW)).toBe(10);
    expect(cssPixels('calc(-1 * 16px)', WINDOW)).toBe(-16);
  });

  it('picks the bound of a min, a max and a clamp', () => {
    expect(cssPixels('min(320px, 50vw)', WINDOW)).toBe(320);
    expect(cssPixels('max(320px, calc(10px + 10px))', WINDOW)).toBe(320);
    expect(cssPixels('clamp(260px, 20vw, 360px)', WINDOW)).toBe(288);
    expect(cssPixels('clamp(260px, 10vw, 360px)', WINDOW)).toBe(260);
  });

  it('refuses a unit it can’t turn into pixels', () => {
    expect(() => cssPixels('2em', WINDOW)).toThrow('unsupported unit');
    expect(() => cssPixels('fit-content(10px)', WINDOW)).toThrow('unsupported function');
  });
});

describe('a track list', () => {
  it('keeps each track whole', () => {
    expect(cssTracks('250px calc(100vw - 1190px) min(360px, 400px)', WINDOW)).toEqual([
      250, 250, 360,
    ]);
  });
});
