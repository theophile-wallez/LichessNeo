import { createElement } from '#shared/dom.ts';

// The panel's few kinds of controls, each a labelled row that reports its
// changes and can be set back from outside.

export interface Control<T> {
  readonly element: HTMLElement;
  readonly set: (value: T) => void;
}

export function section(panel: HTMLElement, title: string): HTMLElement {
  const box = createElement('section', { className: 'section' });
  box.append(createElement('h2', { text: title }));
  panel.append(box);
  return box;
}

function row(label: string, ...controls: HTMLElement[]): HTMLElement {
  const element = createElement('label', { className: 'row' });
  element.append(createElement('span', { className: 'label', text: label }), ...controls);
  return element;
}

export function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = createElement('button', { text: label, attrs: { type: 'button' } });
  element.addEventListener('click', onClick);
  return element;
}

export function buttons(...items: HTMLButtonElement[]): HTMLElement {
  const element = createElement('div', { className: 'buttons' });
  element.append(...items);
  return element;
}

export interface SliderOptions {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  /** Digits shown after the point. */
  readonly digits?: number;
  readonly onInput: (value: number) => void;
}

export function slider(options: SliderOptions): Control<number> {
  const { label, min, max, step, value, digits = 2, onInput } = options;
  const attrs = { type: 'range', min: String(min), max: String(max), step: String(step) };
  const input = createElement('input', { attrs });
  const shown = createElement('output');
  const set = (next: number): void => {
    input.valueAsNumber = next;
    shown.textContent = next.toFixed(digits);
  };
  input.addEventListener('input', () => {
    set(input.valueAsNumber);
    onInput(input.valueAsNumber);
  });
  set(value);
  return { element: row(label, input, shown), set };
}

export function colorField(
  label: string,
  value: string,
  onInput: (value: string) => void,
): Control<string> {
  const input = createElement('input', { attrs: { type: 'color' } });
  const shown = createElement('output');
  const set = (next: string): void => {
    input.value = next;
    shown.textContent = next;
  };
  input.addEventListener('input', () => {
    set(input.value);
    onInput(input.value);
  });
  set(value);
  return { element: row(label, input, shown), set };
}

export function toggle(
  label: string,
  value: boolean,
  onChange: (value: boolean) => void,
): Control<boolean> {
  const input = createElement('input', { attrs: { type: 'checkbox' } });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return {
    element: row(label, input),
    set: next => {
      input.checked = next;
    },
  };
}

export interface ChoiceOptions<T extends string> {
  readonly label: string;
  readonly values: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onPick: (value: T) => void;
}

export interface ChoiceControl<T> extends Control<T> {
  /** Shows or hides a value's button. */
  readonly offer: (value: T, offered: boolean) => void;
}

/** One button per value, the picked one pressed; picking the pressed one picks it again. */
export function choice<T extends string>(options: ChoiceOptions<T>): ChoiceControl<T> {
  const items = options.values.map(({ value, label }) => ({
    value,
    element: button(label, () => {
      set(value);
      options.onPick(value);
    }),
  }));
  function set(picked: T): void {
    for (const { value, element } of items)
      element.setAttribute('aria-pressed', String(value === picked));
  }
  set(options.value);
  const group = buttons(...items.map(item => item.element));
  const element = createElement('div', { className: 'choice' });
  element.append(createElement('span', { className: 'label', text: options.label }), group);
  const offer = (value: T, offered: boolean): void => {
    const item = items.find(candidate => candidate.value === value);
    if (item) item.element.hidden = !offered;
  };
  return { element, set, offer };
}

export function select(
  label: string,
  values: readonly { readonly value: string; readonly label: string }[],
  onPick: (value: string) => void,
): Control<string> {
  const input = createElement('select');
  for (const { value, label: text } of values)
    input.append(createElement('option', { text, attrs: { value } }));
  input.addEventListener('change', () => onPick(input.value));
  return {
    element: row(label, input),
    set: next => {
      input.value = next;
    },
  };
}
