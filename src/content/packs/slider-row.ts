import ArrowTurnBackwardIcon from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import type { StoredOption } from './stored-option.ts';

// A setting that takes a number: a slider, which the page follows as it's
// dragged, its value, and a button that puts the default back. A theme's is a
// row of its panel, with its label.

export interface SliderSpec {
  readonly label: string;
  readonly setting: Pick<StoredOption<number>, 'read' | 'choose'>;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly fallback: number;
  /** After the value: a percent by default. */
  readonly unit?: string;
}

export interface Slider {
  readonly elements: readonly HTMLElement[];
  /** Shows `shown`, set elsewhere, without choosing it again. */
  readonly show: (shown: number) => void;
}

export function buildSlider(spec: SliderSpec): Slider {
  const { label, setting, min, max, step, fallback, unit = '%' } = spec;
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
    value.textContent = `${shown}${unit}`;
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
  show(setting.read());
  return { elements: [input, value, reset], show };
}

export function sliderRow(spec: SliderSpec): HTMLElement {
  const row = createElement('div', { className: 'ln-ext-src-option-row ln-ext-src-slider-row' });
  row.append(
    createElement('span', { className: 'ln-ext-src-option-label', text: spec.label }),
    ...buildSlider(spec).elements,
  );
  return row;
}
