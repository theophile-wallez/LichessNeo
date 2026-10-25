import { setStyleProperty } from './dom.ts';

// A slider's track filled up to its thumb: Chrome can't style the part
// before the thumb, so the CSS paints it from `--ln-ext-slider-fill`.

/** How far along a range input's value stands, as a percentage. */
export function sliderShare(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function setSliderFill(input: HTMLInputElement): void {
  const min = input.min === '' ? 0 : Number(input.min);
  const max = input.max === '' ? 100 : Number(input.max);
  const share = sliderShare(input.valueAsNumber, min, max);
  setStyleProperty(input, '--ln-ext-slider-fill', `${share}%`);
}
