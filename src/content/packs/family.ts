import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, setHtml } from '#shared/html.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { FAMILY_ROWS } from './options.ts';
import { type Family, familyOf, themesOf } from './themes.ts';

// A family of themes, such as the backlit boards: one tile in the panel's
// list, which opens the family's view, its themes and the settings they
// share, with a way back. The panel opens on that view while one of them is
// picked, as the tabs open on what the page shows.

const VIEW = '.lr-ext-src-family';

/** The view of the family `open`, or the list for null. */
export function openFamily(section: HTMLElement, open: string | null): void {
  setData(section, 'lrExtOpen', open);
  for (const view of queryAll(section, `:scope > ${VIEW}`, HTMLElement))
    view.hidden = view.dataset.lrExtFamily !== open;
}

/** The family's tile in the list, showing the theme picked in it, or its first. */
export function familyItem(kind: PartKind, family: Family): HTMLButtonElement {
  const item = createElement('button', {
    attrs: {
      type: 'button',
      class: 'lr-ext-src-item lr-ext-src-family-item',
      'data-lr-ext-family': family.id,
      title: family.name,
      'aria-label': family.name,
    },
  });
  const first = themesOf(kind).find(theme => theme.family === family.id);
  const thumb = createElement('span', { className: 'lr-ext-src-thumb' });
  if (first) setData(thumb, 'lrExtTheme', first.id);
  item.append(thumb);
  item.addEventListener('click', () => {
    const section = item.closest('.lr-ext-src-choices');
    if (section instanceof HTMLElement) openFamily(section, family.id);
  });
  return item;
}

/** The family's view: the way back, its themes' tiles, then its settings. */
export function familyView(family: Family, items: readonly HTMLElement[]): HTMLElement {
  const view = createElement('div', {
    className: 'lr-ext-src-family',
    attrs: { 'data-lr-ext-family': family.id },
  });
  const back = createElement('button', {
    className: 'lr-ext-src-back',
    attrs: { type: 'button' },
  });
  setHtml(back, html`${hugeicon(ArrowLeft01Icon)}<span>${family.name}</span>`);
  back.addEventListener('click', () => {
    const section = view.parentElement;
    if (section) openFamily(section, null);
  });
  const list = createElement('div', { className: 'lr-ext-src-list' });
  list.append(...items);
  view.append(back, list, ...(FAMILY_ROWS[family.id] ?? []).map(row => row()));
  return view;
}

/** Rings the family of the theme picked, its tile showing that theme. */
export function markFamilies(panel: HTMLElement, kind: PartKind, current: string): void {
  const picked = familyOf(kind, current);
  for (const item of queryAll(panel, '.lr-ext-src-family-item', HTMLElement)) {
    const on = item.dataset.lrExtFamily === picked;
    item.classList.toggle('active', on);
    const thumb = queryOne(item, '.lr-ext-src-thumb', HTMLElement);
    if (on && thumb) setData(thumb, 'lrExtTheme', current);
  }
}
