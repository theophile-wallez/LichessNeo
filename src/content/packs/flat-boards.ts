import { setData, setStyleProperty } from '#shared/dom.ts';
import { BUILT_IN_THEMES } from '#content/colors/built-in.ts';
import { DEFAULT_CUSTOM_BOARD, type SquareColors } from './custom-board.ts';
import { savedBoards } from './saved-boards.ts';

// The extension's two-tone boards in set colors: white and each color theme's
// accent, and the ones the user saved (saved-boards.ts). Whichever is shown,
// its colors are variables on <html>, for styles/board/pieces.css.

export interface FlatBoard extends SquareColors {
  readonly id: string;
  readonly name: string;
}

const capitalized = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

// Each color theme's accent on the dark scheme, the one the board shows on either.
export const PRESET_BOARDS: readonly FlatBoard[] = BUILT_IN_THEMES.map(theme => ({
  id: `tone-${theme.id}`,
  name: capitalized(theme.id),
  light: DEFAULT_CUSTOM_BOARD.light,
  dark: theme.dark.accent.toLowerCase(),
}));

/** The board of id `id` among the presets and the saved ones, if it's one of them. */
export const flatBoard = (id: string): FlatBoard | undefined =>
  PRESET_BOARDS.find(board => board.id === id) ?? savedBoards().find(board => board.id === id);

export function showFlatBoard(board: SquareColors | undefined): void {
  const root = document.documentElement;
  setStyleProperty(root, '--ln-ext-board-flat-light', board?.light ?? null);
  setStyleProperty(root, '--ln-ext-board-flat-dark', board?.dark ?? null);
}

/** Gives a tile's thumbnail a two-tone board's colors, which its stylesheet draws as squares. */
export function showSquares(thumb: HTMLElement, { light, dark }: SquareColors): void {
  setData(thumb, 'lnExtSquares', '');
  setStyleProperty(thumb, '--ln-ext-thumb-light', light);
  setStyleProperty(thumb, '--ln-ext-thumb-dark', dark);
}
