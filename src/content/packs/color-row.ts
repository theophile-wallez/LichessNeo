import { createElement, queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import {
  chooseSquareColor,
  DEFAULT_CUSTOM_BOARD,
  isHexColor,
  onCustomBoardChange,
  readCustomBoard,
  type SquareShade,
} from './custom-board.ts';
import type { Library } from './library.ts';
import { MAX_BOARD_NAME, saveBoard } from './saved-boards.ts';
import { CUSTOM_BOARD } from './themes.ts';

// The custom board's rows under its tile: its light squares' color, a pale
// tone or any other, its dark squares', any, and a name to save it under as a
// board of its own (saved-boards.ts).

interface Swatch {
  readonly color: string;
  readonly name: string;
}

const LIGHT_TONES: readonly Swatch[] = [
  { color: DEFAULT_CUSTOM_BOARD.light, name: 'White' },
  { color: '#f0ead8', name: 'Ivory' },
  { color: '#dfe4ec', name: 'Mist' },
  { color: '#e6dcf2', name: 'Lilac' },
];

const SWATCHES: Readonly<Record<SquareShade, readonly Swatch[]>> = {
  light: LIGHT_TONES,
  dark: [],
};

const LABELS: Readonly<Record<SquareShade, string>> = {
  light: 'Light squares',
  dark: 'Dark squares',
};

function markRow(row: HTMLElement, shade: SquareShade): void {
  const color = readCustomBoard()[shade];
  let matched = false;
  for (const swatch of queryAll(row, '[data-lr-ext-color]', HTMLElement)) {
    const on = swatch.dataset.lrExtColor === color;
    matched ||= on;
    swatch.classList.toggle('active', on);
  }
  for (const own of queryAll(row, '.lr-ext-src-color-own', HTMLElement)) {
    own.classList.toggle('active', !matched);
    setStyleProperty(own, '--lr-ext-src-color', color);
  }
  for (const input of queryAll(row, 'input', HTMLInputElement))
    if (input.value !== color) input.value = color;
  for (const code of queryAll(row, '.lr-ext-src-color-code', HTMLElement))
    if (code.textContent !== color) code.textContent = color;
}

function swatchButton({ color, name }: Swatch): HTMLButtonElement {
  const button = createElement('button', {
    className: 'lr-ext-src-color',
    attrs: {
      type: 'button',
      'data-lr-ext-color': color,
      'data-lr-ext-tip': name,
      'aria-label': name,
    },
  });
  setStyleProperty(button, '--lr-ext-src-color', color);
  return button;
}

// Any color: the input's own swatch, in a pill with the color's code.
function ownColor(shade: SquareShade): HTMLElement {
  const own = createElement('label', { className: 'lr-ext-src-color-own' });
  const input = createElement('input', { attrs: { type: 'color', 'aria-label': LABELS[shade] } });
  // While the picker is dragged, the board follows.
  input.addEventListener('input', () => {
    if (isHexColor(input.value)) chooseSquareColor(shade, input.value);
  });
  own.append(input, createElement('span', { className: 'lr-ext-src-color-code' }));
  return own;
}

function row(label: string): HTMLElement {
  const element = createElement('div', { className: 'lr-ext-src-option-row lr-ext-src-color-row' });
  setData(element, 'lrExtFor', CUSTOM_BOARD);
  element.append(createElement('span', { className: 'lr-ext-src-option-label', text: label }));
  return element;
}

/** The row of the light or the dark squares, shown while the custom board is picked. */
export function colorRow(shade: SquareShade): HTMLElement {
  const element = row(LABELS[shade]);
  const group = createElement('div', {
    className: 'lr-ext-src-colors',
    attrs: { role: 'group', 'aria-label': LABELS[shade] },
  });
  group.append(...SWATCHES[shade].map(swatchButton), ownColor(shade));
  group.addEventListener('click', event => {
    const color = event.target instanceof HTMLElement ? event.target.dataset.lrExtColor : undefined;
    if (color !== undefined) chooseSquareColor(shade, color);
  });
  element.append(group);
  // The panel builds its rows anew each time it opens: one taken out stops listening.
  const stop = onCustomBoardChange(() => (element.isConnected ? markRow(element, shade) : stop()));
  markRow(element, shade);
  return element;
}

/** The row that saves the custom board under a name, and shows that board at once. */
export function saveRow(library: Library): HTMLElement {
  const element = row('Save as');
  const form = createElement('form', { className: 'lr-ext-src-save' });
  const input = createElement('input', {
    attrs: {
      type: 'text',
      maxlength: String(MAX_BOARD_NAME),
      placeholder: 'My board',
      'aria-label': 'The board’s name',
      autocomplete: 'off',
    },
  });
  const save = createElement('button', { text: 'Save', attrs: { type: 'submit' } });
  form.append(input, save);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = input.value.trim() || 'My board';
    const id = saveBoard(name, readCustomBoard());
    if (id === null) return;
    input.value = '';
    library.choose('board', id);
  });
  element.append(form);
  return element;
}
