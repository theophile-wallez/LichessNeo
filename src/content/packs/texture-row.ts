import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import {
  chooseStrength,
  chooseTexture,
  customStrength,
  onCustomBoardChange,
  readCustomBoard,
} from './custom-board.ts';
import { sliderRow } from './slider-row.ts';
import type { StoredOption } from './stored-option.ts';
import { FULL_STRENGTH, showTexture, TEXTURES, type TextureId, TextureSchema } from './textures.ts';
import { CUSTOM_BOARD } from './themes.ts';

// The custom board's texture rows, under its colors: the material laid over
// them, none at first, each tile showing it in the board's colors, and how
// strongly it shows.

const NONE = 'none';

function textureButton(id: TextureId | typeof NONE, name: string): HTMLButtonElement {
  const button = createElement('button', {
    className: 'ln-ext-src-texture',
    attrs: {
      type: 'button',
      'data-ln-ext-texture': id,
      'data-ln-ext-tip': name,
      'aria-label': name,
    },
  });
  if (id !== NONE) showTexture(button, 'thumb', { texture: id });
  return button;
}

function markTextures(row: HTMLElement): void {
  const current = readCustomBoard().texture ?? NONE;
  for (const button of queryAll(row, '[data-ln-ext-texture]', HTMLElement))
    button.classList.toggle('active', button.dataset.lnExtTexture === current);
}

/** The row of textures, shown while the custom board is picked. */
export function textureRow(): HTMLElement {
  const element = createElement('div', { className: 'ln-ext-src-option-row' });
  setData(element, 'lnExtFor', CUSTOM_BOARD);
  const group = createElement('div', {
    className: 'ln-ext-src-textures',
    attrs: { role: 'group', 'aria-label': 'Texture' },
  });
  group.append(
    textureButton(NONE, 'None'),
    ...TEXTURES.map(({ id, name }) => textureButton(id, name)),
  );
  group.addEventListener('click', event => {
    const id = event.target instanceof HTMLElement ? event.target.dataset.lnExtTexture : undefined;
    if (id === undefined) return;
    const texture = TextureSchema.safeParse(id);
    chooseTexture(texture.success ? texture.data : undefined);
  });
  element.append(
    createElement('span', { className: 'ln-ext-src-option-label', text: 'Texture' }),
    group,
  );
  // The panel builds its rows anew each time it opens: one taken out stops listening.
  const stop = onCustomBoardChange(() => (element.isConnected ? markTextures(element) : stop()));
  markTextures(element);
  return element;
}

const strength: StoredOption<number> = {
  read: customStrength,
  choose: chooseStrength,
  onChange: listener => {
    onCustomBoardChange(() => listener(customStrength()));
  },
};

/** The texture's strength, a slider that waits for a texture. */
export function strengthRow(): HTMLElement {
  const element = sliderRow({
    label: 'Strength',
    setting: strength,
    min: 0,
    max: FULL_STRENGTH,
    step: 1,
    fallback: FULL_STRENGTH,
  });
  setData(element, 'lnExtFor', CUSTOM_BOARD);
  const input = queryOne(element, 'input', HTMLInputElement);
  const mark = (): void => {
    if (input) input.disabled = readCustomBoard().texture === undefined;
  };
  const stop = onCustomBoardChange(() => (element.isConnected ? mark() : stop()));
  mark();
  return element;
}
