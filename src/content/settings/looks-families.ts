import { BACKLIT } from '#shared/backlit.ts';
import { createElement, setData } from '#shared/dom.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import { FAMILY_ROWS } from '#content/packs/options.ts';
import { CUSTOM_BOARD, FAMILIES, themesOf, type Theme } from '#content/packs/themes.ts';

// A Board & sounds card's sections, for a part whose themes come in families
// (the boards): the classic ones, then each family's (the woods, the marbles,
// the rest of the materials, the backlit boards), each with its tiles and the
// settings they share, shown while one of them is picked; the user's own come
// last, with the packs' (looks-card.ts).

const NAMES: Readonly<Record<string, string>> = {
  wood: 'looksWood',
  marble: 'looksMarble',
  misc: 'looksMisc',
  [BACKLIT]: 'looksBacklit',
};

export const hasFamilies = (kind: PartKind): boolean =>
  themesOf(kind).some(theme => theme.family !== undefined);

export const subLabel = (text: string): HTMLElement =>
  createElement('h4', { className: 'ln-ext-looks__sub', text });

// The board the user colors, and those they saved from it.
const isUsers = (theme: Theme): boolean => theme.id === CUSTOM_BOARD || theme.saved === true;

/** The themes of the card's own list, beside the packs: with families, only the user's. */
export const listedThemes = (kind: PartKind): readonly Theme[] =>
  themesOf(kind).filter(
    theme => theme.family === undefined && (isUsers(theme) || !hasFamilies(kind)),
  );

function familySection(kind: PartKind, family: string, tile: (theme: Theme) => HTMLElement) {
  const themes = themesOf(kind).filter(theme => theme.family === family);
  if (themes.length === 0) return [];
  const grid = createElement('div', { className: 'ln-ext-looks__grid' });
  grid.append(...themes.map(tile));
  const rows = createElement('div', { className: 'ln-ext-looks__family' });
  setData(rows, 'lnExtFamily', family);
  rows.append(...(FAMILY_ROWS[family] ?? []).map(row => row()));
  const name = NAMES[family];
  return [subLabel(name === undefined ? family : message(name)), grid, rows];
}

/** The part's sections before its own list: the classic themes, then each family's. */
export function familySections(kind: PartKind, tile: (theme: Theme) => HTMLElement): HTMLElement[] {
  if (!hasFamilies(kind)) return [];
  const classic = createElement('div', { className: 'ln-ext-looks__grid' });
  classic.append(
    ...themesOf(kind)
      .filter(theme => theme.family === undefined && !isUsers(theme))
      .map(tile),
  );
  return [
    subLabel(message('looksClassic')),
    classic,
    ...FAMILIES.flatMap(family => familySection(kind, family.id, tile)),
    subLabel(message('looksCustom')),
  ];
}
