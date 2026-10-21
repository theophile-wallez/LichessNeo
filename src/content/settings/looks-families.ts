import { BACKLIT } from '#shared/backlit.ts';
import { createElement, setData } from '#shared/dom.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import { MATERIALS } from '#content/packs/materials.ts';
import { FAMILY_ROWS } from '#content/packs/options.ts';
import { FAMILIES, themesOf, type Theme } from '#content/packs/themes.ts';

// A Board & sounds card's sections for its families of themes (the material
// and the backlit boards), apart from the classic ones: each with its tiles,
// then the settings they share, shown while one of them is picked (looks-card.ts).

const NAMES: Readonly<Record<string, string>> = {
  [MATERIALS]: 'looksMaterials',
  [BACKLIT]: 'looksBacklit',
};

export const hasFamilies = (kind: PartKind): boolean =>
  themesOf(kind).some(theme => theme.family !== undefined);

export const subLabel = (text: string): HTMLElement =>
  createElement('h4', { className: 'ln-ext-looks__sub', text });

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

/** The part's families, each a title, its tiles and its settings. */
export const familySections = (
  kind: PartKind,
  tile: (theme: Theme) => HTMLElement,
): HTMLElement[] => FAMILIES.flatMap(family => familySection(kind, family.id, tile));
