import ArrowTurnBackwardIcon from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import type { StoredOption } from './stored-option.ts';

// A theme's setting that takes a number: a row with a slider, which the board
// follows as it's dragged, its value, and a button that puts the default back.

export interface SliderRowSpec {
  readonly label: string;
  readonly setting: StoredOption<number>;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly fallback: number;
}

export function sliderRow(spec: SliderRowSpec): HTMLElement {
  const { label, setting, min, max, step, fallback } = spec;
  const row = createElement('div', { className: 'ln-ext-src-option-row ln-ext-src-slider-row' });
  const input = createElement('input', {
    className: 'ln-ext-src-slider',
    attrs: {
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
      'aria-label': label,
    },
  });
  const value = createElement('output', { className: 'ln-ext-src-slider-value' });
  const reset = createElement('button', {
    className: 'ln-ext-src-slider-reset',
    attrs: { type: 'button', 'aria-label': 'Default', 'data-ln-ext-tip': 'Default' },
  });
  setHtml(reset, hugeicon(ArrowTurnBackwardIcon));
  const show = (shown: number): void => {
    if (input.valueAsNumber !== shown) input.value = String(shown);
    value.textContent = `${shown}%`;
    reset.disabled = shown === fallback;
    // The track is filled up to the thumb.
    setStyleProperty(input, '--ln-ext-slider-fill', `${((shown - min) / (max - min)) * 100}%`);
  };
  const choose = (chosen: number): void => {
    setting.choose(chosen);
    show(chosen);
  };
  input.addEventListener('input', () => choose(input.valueAsNumber));
  reset.addEventListener('click', () => choose(fallback));
  row.append(
    createElement('span', { className: 'ln-ext-src-option-label', text: label }),
    input,
    value,
    reset,
  );
  show(setting.read());
  return row;
}
