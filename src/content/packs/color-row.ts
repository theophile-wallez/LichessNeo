import { createElement } from '#shared/dom.ts';
import {
  chooseSquareColor,
  DEFAULT_CUSTOM_BOARD,
  onCustomBoardChange,
  readCustomBoard,
  type SquareShade,
} from './custom-board.ts';
import type { Library } from './library.ts';
import { MAX_BOARD_NAME, saveBoard } from './saved-boards.ts';
import { panelRow, type Swatch, swatchRow } from './swatch-row.ts';
import { CUSTOM_BOARD } from './themes.ts';

// The custom board's rows under its tile: its light squares' color, a pale
// tone or any other, its dark squares', any, and a name to save it under as a
// board of its own (saved-boards.ts).

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

/** The row of the light or the dark squares, shown while the custom board is picked. */
export const colorRow = (shade: SquareShade): HTMLElement =>
  swatchRow({
    label: LABELS[shade],
    swatches: SWATCHES[shade],
    read: () => readCustomBoard()[shade],
    choose: color => chooseSquareColor(shade, color),
    onChange: onCustomBoardChange,
    theme: CUSTOM_BOARD,
  });

/** The row that saves the custom board under a name, and shows that board at once. */
export function saveRow(library: Library): HTMLElement {
  const element = panelRow('Save as', CUSTOM_BOARD);
  const form = createElement('form', { className: 'ln-ext-src-save' });
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
