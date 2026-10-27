import { createElement, queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import { isHexColor } from './custom-board.ts';

// A row of colors in a panel: a few swatches and any other color from the
// browser's picker, in a pill with its code. The custom board's squares
// (color-row.ts) and the black pieces' tint (black-pieces.ts) are such rows.

export interface Swatch {
  readonly color: string;
  readonly name: string;
}

export interface SwatchRowSpec {
  readonly label: string;
  readonly swatches: readonly Swatch[];
  readonly read: () => string;
  readonly choose: (color: string) => void;
  /** Calls the listener on each change, until the function it returns is called. */
  readonly onChange: (listener: () => void) => () => void;
  /** The theme the row belongs to, shown only while it's picked; none to show it always. */
  readonly theme?: string;
}

function markRow(row: HTMLElement, color: string): void {
  let matched = false;
  for (const swatch of queryAll(row, '[data-ln-ext-color]', HTMLElement)) {
    const on = swatch.dataset.lnExtColor === color;
    matched ||= on;
    swatch.classList.toggle('active', on);
  }
  for (const own of queryAll(row, '.ln-ext-src-color-own', HTMLElement)) {
    own.classList.toggle('active', !matched);
    setStyleProperty(own, '--ln-ext-src-color', color);
  }
  for (const input of queryAll(row, 'input', HTMLInputElement))
    if (input.value !== color) input.value = color;
  for (const code of queryAll(row, '.ln-ext-src-color-code', HTMLElement))
    if (code.textContent !== color) code.textContent = color;
}

function swatchButton({ color, name }: Swatch): HTMLButtonElement {
  const button = createElement('button', {
    className: 'ln-ext-src-color',
    attrs: {
      type: 'button',
      'data-ln-ext-color': color,
      'data-ln-ext-tip': name,
      'aria-label': name,
    },
  });
  setStyleProperty(button, '--ln-ext-src-color', color);
  return button;
}

function ownColor(spec: SwatchRowSpec): HTMLElement {
  const own = createElement('label', { className: 'ln-ext-src-color-own' });
  const input = createElement('input', { attrs: { type: 'color', 'aria-label': spec.label } });
  // While the picker is dragged, the page follows.
  input.addEventListener('input', () => {
    if (isHexColor(input.value)) spec.choose(input.value.toLowerCase());
  });
  own.append(input, createElement('span', { className: 'ln-ext-src-color-code' }));
  return own;
}

/** A labelled row, as the swatches' and the save form's. */
export function panelRow(label: string, theme?: string): HTMLElement {
  const element = createElement('div', { className: 'ln-ext-src-option-row ln-ext-src-color-row' });
  if (theme !== undefined) setData(element, 'lnExtFor', theme);
  element.append(createElement('span', { className: 'ln-ext-src-option-label', text: label }));
  return element;
}

export function swatchRow(spec: SwatchRowSpec): HTMLElement {
  const element = panelRow(spec.label, spec.theme);
  const group = createElement('div', {
    className: 'ln-ext-src-colors',
    attrs: { role: 'group', 'aria-label': spec.label },
  });
  group.append(...spec.swatches.map(swatchButton), ownColor(spec));
  group.addEventListener('click', event => {
    const color = event.target instanceof HTMLElement ? event.target.dataset.lnExtColor : undefined;
    if (color !== undefined) spec.choose(color);
  });
  element.append(group);
  // The panel builds its rows anew each time it opens: one taken out stops listening.
  const stop = spec.onChange(() => (element.isConnected ? markRow(element, spec.read()) : stop()));
  markRow(element, spec.read());
  return element;
}
