import { describe, expect, it } from 'vitest';
import { setSliderFill, sliderShare } from './slider-fill.ts';

describe('sliderShare', () => {
  it("gives the value's place between the bounds", () => {
    expect(sliderShare(5, 1, 13)).toBeCloseTo(33.33);
    expect(sliderShare(1, 1, 13)).toBe(0);
    expect(sliderShare(13, 1, 13)).toBe(100);
  });

  it('stays within the track, and at its start for empty bounds', () => {
    expect(sliderShare(20, 0, 10)).toBe(100);
    expect(sliderShare(-5, 0, 10)).toBe(0);
    expect(sliderShare(3, 4, 4)).toBe(0);
  });
});

describe('setSliderFill', () => {
  it("fills the track up to the input's value", () => {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '1';
    input.max = '5';
    input.value = '2';
    setSliderFill(input);
    expect(input.style.getPropertyValue('--ln-ext-slider-fill')).toBe('25%');
  });

  it("takes a range input's default bounds when it sets none", () => {
    const input = document.createElement('input');
    input.type = 'range';
    input.value = '40';
    setSliderFill(input);
    expect(input.style.getPropertyValue('--ln-ext-slider-fill')).toBe('40%');
  });
});
