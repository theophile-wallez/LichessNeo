import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { KeyGapSchema } from '#shared/backlit.ts';
import { buildSlider, sliderRow } from './slider-row.ts';
import { storedNumber } from './stored-option.ts';

const KEY = 'ln-ext-backlit-gap';

function gapRow(): { slider: HTMLInputElement; value: HTMLElement; reset: HTMLButtonElement } {
  const row = sliderRow({
    label: 'Gap',
    setting: storedNumber(KEY, KeyGapSchema, 5.5),
    min: 0,
    max: 16,
    step: 0.5,
    fallback: 5.5,
  });
  const slider = queryOne(row, 'input[type="range"]', HTMLInputElement);
  const value = queryOne(row, 'output', HTMLElement);
  const reset = queryOne(row, 'button', HTMLButtonElement);
  if (!slider || !value || !reset) throw new Error('no slider');
  expect(queryOne(row, '.ln-ext-src-option-label', HTMLElement)?.textContent).toBe('Gap');
  return { slider, value, reset };
}

const fill = (slider: HTMLInputElement): string =>
  slider.style.getPropertyValue('--ln-ext-slider-fill');

afterEach(() => {
  localStorage.clear();
});

describe('sliderRow', () => {
  it('shows the stored value in its range, the default with nothing to reset', () => {
    const { slider, value, reset } = gapRow();
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['0', '16', '0.5', '5.5']);
    expect(value.textContent).toBe('5.5%');
    expect(fill(slider)).toBe('34.375%');
    expect(reset.disabled).toBe(true);
    localStorage.setItem(KEY, '8');
    const stored = gapRow();
    expect([stored.slider.value, stored.value.textContent, fill(stored.slider)]).toEqual([
      '8',
      '8%',
      '50%',
    ]);
    expect(stored.reset.disabled).toBe(false);
  });

  it('keeps the value as it’s dragged, and puts the default back', () => {
    const { slider, value, reset } = gapRow();
    slider.value = '2';
    slider.dispatchEvent(new Event('input'));
    expect(localStorage.getItem(KEY)).toBe('2');
    expect([value.textContent, fill(slider), reset.disabled]).toEqual(['2%', '12.5%', false]);
    reset.click();
    expect(localStorage.getItem(KEY)).toBe('5.5');
    expect([slider.value, value.textContent, reset.disabled]).toEqual(['5.5', '5.5%', true]);
  });
});

describe('buildSlider', () => {
  it('shows its unit, and a value set elsewhere without choosing it', () => {
    const chosen: number[] = [];
    const slider = buildSlider({
      label: 'Radius',
      setting: { read: () => 4, choose: radius => chosen.push(radius) },
      min: 0,
      max: 16,
      step: 1,
      fallback: 8,
      unit: 'px',
    });
    const [input, value, reset] = slider.elements;
    if (!(input instanceof HTMLInputElement) || !(reset instanceof HTMLButtonElement))
      throw new Error('no slider');
    expect([input.value, value?.textContent, reset.disabled]).toEqual(['4', '4px', false]);
    slider.show(8);
    expect([input.value, value?.textContent, fill(input), reset.disabled]).toEqual([
      '8',
      '8px',
      '50%',
      true,
    ]);
    expect(chosen).toEqual([]);
  });
});
