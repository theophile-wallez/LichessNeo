import { describe, expect, it } from 'vitest';
import { waveFront } from './front.ts';
import { waveDuration, waveStyle } from './style.ts';

const AREA = { x: 0, y: 0, width: 600, height: 600 };
const SOURCE = { x: 275, y: 275, width: 50, height: 50 };

describe('the wave’s front', () => {
  it('leaves from its source’s middle', () => {
    const front = waveFront(0.3, SOURCE, AREA, waveStyle('center'));
    expect([front.originX, front.originY]).toEqual([300, 300]);
    expect(front.ring).toBe(true);
    expect(front.hold).toBe(25);
  });

  it('gathers on its source, then grows past the area’s far corner', () => {
    const style = waveStyle('center');
    const launch = style.anticipation / waveDuration(style);
    const gathering = waveFront(launch / 2, SOURCE, AREA, style);
    expect(gathering.radius).toBeGreaterThan(25);
    expect(gathering.gravity).toBeGreaterThan(0);
    expect(gathering.energy).toBe(0);
    const radii = [0.2, 0.4, 0.6, 0.8].map(
      progress => waveFront(progress, SOURCE, AREA, style).radius,
    );
    expect(radii).toEqual(radii.toSorted((one, other) => one - other));
    // The farthest corner is 300√2 from the middle.
    expect(waveFront(1, SOURCE, AREA, style).radius).toBeGreaterThan(300 * Math.SQRT2);
  });

  it('lenses only while it travels, and has settled by the end', () => {
    const style = waveStyle('vertical');
    expect(waveFront(0, SOURCE, AREA, style).energy).toBe(0);
    expect(waveFront(0.35, SOURCE, AREA, style).energy).toBeGreaterThan(0.5);
    const end = waveFront(1, SOURCE, AREA, style);
    expect(end.energy).toBe(0);
    expect(end.rim).toBe(0);
  });

  it('turns a quarter for a horizontal wave, and stretches a straight one', () => {
    const wide = { x: 100, y: 560, width: 400, height: 60 };
    expect(waveFront(0.5, wide, AREA, waveStyle('horizontal')).tilt).toBeCloseTo(Math.PI / 2);
    const vertical = waveFront(0, wide, AREA, waveStyle('vertical'));
    expect(vertical.tilt).toBe(0);
    expect(vertical.spine).toBe(170);
    expect(waveFront(1, wide, AREA, waveStyle('vertical')).squash).toBeCloseTo(1.4);
  });
});

describe('the wave’s style', () => {
  it('lasts until its edges have cleared', () => {
    // 0.5 + (−0.35 + 0.47 + 3), the hairline's fade: the longest part.
    expect(waveDuration(waveStyle('vertical'))).toBeCloseTo(3.62);
    expect(waveDuration(waveStyle('vertical', { hairlineFade: 1, rimFade: 1 }))).toBeCloseTo(
      0.5 + 2.28 * 0.6,
    );
  });

  it('makes a ring gentler than a front, under the changes asked', () => {
    expect(waveStyle('center').aberration).toBe(0);
    expect(waveStyle('vertical').aberration).toBe(0.78);
    expect(waveStyle('center', { aberration: 0.4 })).toMatchObject({
      aberration: 0.4,
      type: 'center',
    });
  });
});
