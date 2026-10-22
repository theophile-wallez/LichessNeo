import { setData, setStyleProperty } from '#shared/dom.ts';
import { BUILT_IN_THEMES } from '#content/colors/built-in.ts';
import { type CustomBoard, DEFAULT_CUSTOM_BOARD } from './custom-board.ts';
import { MATERIAL_BOARDS } from './materials.ts';
import { savedBoards } from './saved-boards.ts';
import { warmTexture } from './texture-warm.ts';
import { showTexture } from './textures.ts';

// The extension's two-tone boards in set colors: white and each color theme's
// accent, the material ones (materials.ts), and the ones the user saved
// (saved-boards.ts). Whichever is shown, its colors and texture are variables
// on <html>, for styles/board/pieces.css.

export type FlatBoard = CustomBoard & {
  readonly id: string;
  readonly name: string;
};

const capitalized = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

// Each color theme's accent on the dark scheme, the one the board shows on either.
export const PRESET_BOARDS: readonly FlatBoard[] = BUILT_IN_THEMES.map(theme => ({
  id: `tone-${theme.id}`,
  name: capitalized(theme.id),
  light: DEFAULT_CUSTOM_BOARD.light,
  dark: theme.dark.accent.toLowerCase(),
}));

/** The board of id `id` among the presets, the materials and the saved ones, if it's one of them. */
export const flatBoard = (id: string): FlatBoard | undefined =>
  [...PRESET_BOARDS, ...MATERIAL_BOARDS, ...savedBoards()].find(board => board.id === id);

export function showFlatBoard(board: CustomBoard | undefined): void {
  const root = document.documentElement;
  setStyleProperty(root, '--ln-ext-board-flat-light', board?.light ?? null);
  setStyleProperty(root, '--ln-ext-board-flat-dark', board?.dark ?? null);
  showTexture(root, 'board-flat', board ?? {});
  warmTexture(board?.texture);
}

/** Gives a tile's thumbnail a two-tone board's look, which its stylesheet draws as squares. */
export function showSquares(thumb: HTMLElement, board: CustomBoard): void {
  setData(thumb, 'lnExtSquares', '');
  setStyleProperty(thumb, '--ln-ext-thumb-light', board.light);
  setStyleProperty(thumb, '--ln-ext-thumb-dark', board.dark);
  showTexture(thumb, 'thumb', board);
}
