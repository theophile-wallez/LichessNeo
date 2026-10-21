import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, setHtml } from '#shared/html.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { showSquares } from './flat-boards.ts';
import { FAMILY_ROWS } from './options.ts';
import { type Family, familyOf, type Theme, themesOf } from './themes.ts';

// A family of themes, such as the backlit boards: one tile in the panel's
// list, which opens the family's view, its themes and the settings they
// share, with a way back. The panel opens on that view while one of them is
// picked, as the tabs open on what the page shows.

const VIEW = '.ln-ext-src-family';

// The tile's picture: a backlit board's is drawn from its id, a material one's from its look.
function paintThumb(thumb: HTMLElement, { id, colors }: Theme): void {
  setData(thumb, 'lnExtTheme', id);
  if (colors) showSquares(thumb, colors);
}

/** The view of the family `open`, or the list for null. */
export function openFamily(section: HTMLElement, open: string | null): void {
  setData(section, 'lnExtOpen', open);
  for (const view of queryAll(section, `:scope > ${VIEW}`, HTMLElement))
    view.hidden = view.dataset.lnExtFamily !== open;
}

/** The family's tile in the list, showing the theme picked in it, or its first. */
export function familyItem(kind: PartKind, family: Family): HTMLButtonElement {
  const item = createElement('button', {
    attrs: {
      type: 'button',
      class: 'ln-ext-src-item ln-ext-src-family-item',
      'data-ln-ext-family': family.id,
      title: family.name,
      'aria-label': family.name,
    },
  });
  const first = themesOf(kind).find(theme => theme.family === family.id);
  const thumb = createElement('span', { className: 'ln-ext-src-thumb' });
  if (first) paintThumb(thumb, first);
  item.append(thumb);
  item.addEventListener('click', () => {
    const section = item.closest('.ln-ext-src-choices');
    if (section instanceof HTMLElement) openFamily(section, family.id);
  });
  return item;
}

/** The family's view: the way back, its themes' tiles, then its settings. */
export function familyView(family: Family, items: readonly HTMLElement[]): HTMLElement {
  const view = createElement('div', {
    className: 'ln-ext-src-family',
    attrs: { 'data-ln-ext-family': family.id },
  });
  const back = createElement('button', {
    className: 'ln-ext-src-back',
    attrs: { type: 'button' },
  });
  setHtml(back, html`${hugeicon(ArrowLeft01Icon)}<span>${family.name}</span>`);
  back.addEventListener('click', () => {
    const section = view.parentElement;
    if (section) openFamily(section, null);
  });
  const list = createElement('div', { className: 'ln-ext-src-list' });
  list.append(...items);
  view.append(back, list, ...(FAMILY_ROWS[family.id] ?? []).map(row => row()));
  return view;
}

/** Rings the family of the theme picked, its tile showing that theme. */
export function markFamilies(panel: HTMLElement, kind: PartKind, current: string): void {
  const picked = familyOf(kind, current);
  const theme = themesOf(kind).find(entry => entry.id === current);
  for (const item of queryAll(panel, '.ln-ext-src-family-item', HTMLElement)) {
    const on = item.dataset.lnExtFamily === picked;
    item.classList.toggle('active', on);
    const thumb = queryOne(item, '.ln-ext-src-thumb', HTMLElement);
    if (on && thumb && theme) paintThumb(thumb, theme);
  }
}
