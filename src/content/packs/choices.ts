import { createElement, setData, setStyleProperty } from '#shared/dom.ts';
import { hasPart, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { packsUrl } from '#content/settings/address.ts';
import type { Library } from './library.ts';
import { importForm } from './import-form.ts';
import { familyItem, familyView, openFamily } from './family.ts';
import { OPTION_ROWS } from './options.ts';
import { showSquares } from './flat-boards.ts';
import { FAMILIES, familyOf, themesOf, type Theme } from './themes.ts';

// The Extension tab of a panel: the extension's themes for its part, a
// family's under its one tile (family.ts), and the themes' settings; and its
// Packs tab: the imported packs that have the part. Packs are imported and
// removed in the extension's settings, which a link under them leads to;
// signed out, they're imported right there.

const NOUNS: Readonly<Record<PartKind, string>> = {
  board: 'board',
  piece: 'piece set',
  sound: 'sound set',
};

function thumbnail(kind: PartKind, pack: Pack): string | null {
  if (kind === 'board') return pack.board?.image ?? null;
  return pack.pieces?.wN ?? null;
}

interface Choice {
  readonly kind: PartKind;
  readonly id: string;
  readonly name: string;
  /** The tile's picture: a URL, or null for one the CSS draws. */
  readonly image: string | null;
}

// Boards and pieces are pictures, their name in the tooltip, as Lichess's
// tiles are; sounds are names, as Lichess's list is.
function choiceItem({ kind, id, name, image }: Choice, library: Library): HTMLButtonElement {
  const item = createElement('button', {
    attrs: { type: 'button', class: 'ln-ext-src-item', 'data-ln-ext-choice': id },
  });
  if (kind === 'sound')
    item.append(createElement('span', { className: 'ln-ext-src-name', text: name }));
  else {
    item.title = name;
    item.setAttribute('aria-label', name);
    const thumb = createElement('span', { className: 'ln-ext-src-thumb' });
    if (image === null) setData(thumb, 'lnExtTheme', id);
    else setStyleProperty(thumb, 'background-image', `url("${image}")`);
    item.append(thumb);
  }
  item.addEventListener('click', () => library.choose(kind, id));
  return item;
}

function themeItem(kind: PartKind, { id, name, colors }: Theme, library: Library): HTMLElement {
  const item = choiceItem({ kind, id, name, image: null }, library);
  const thumb = item.querySelector('.ln-ext-src-thumb');
  if (colors && thumb instanceof HTMLElement) showSquares(thumb, colors);
  return item;
}

const packItem = (kind: PartKind, pack: Pack, library: Library): HTMLElement =>
  choiceItem({ kind, id: pack.id, name: pack.name, image: thumbnail(kind, pack) }, library);

// A family's tile stands where its first theme would.
function themeItems(kind: PartKind, library: Library): HTMLElement[] {
  return themesOf(kind).flatMap(theme => {
    if (theme.family === undefined) return [themeItem(kind, theme, library)];
    const family = FAMILIES.find(entry => entry.id === theme.family);
    const first = themesOf(kind).find(entry => entry.family === theme.family);
    return family && first === theme ? [familyItem(kind, family)] : [];
  });
}

function themeListing(kind: PartKind, library: Library): HTMLElement {
  const listing = createElement('div', { className: 'ln-ext-src-listing' });
  const list = createElement('div', { className: 'ln-ext-src-list' });
  list.append(...themeItems(kind, library));
  listing.append(list);
  return listing;
}

/** The imported packs that have the part, or a line if there are none or they can't be read. */
function packListing(kind: PartKind, library: Library): HTMLElement {
  const listing = createElement('div', { className: 'ln-ext-src-listing' });
  const packs = library.packs().filter(pack => hasPart(pack, kind));
  if (packs.length > 0) {
    const list = createElement('div', { className: 'ln-ext-src-list' });
    list.append(...packs.map(pack => packItem(kind, pack, library)));
    listing.append(list);
  }
  const note = library.unreadable()
    ? 'The imported packs could not be read.'
    : `No ${NOUNS[kind]} imported yet: bring your own from GitHub.`;
  if (library.unreadable() || packs.length === 0)
    listing.append(createElement('p', { className: 'ln-ext-src-empty', text: note }));
  return listing;
}

/** Draws the panel's lists again, as packs are read, imported or removed, and boards saved. */
export function refreshListing(panel: HTMLElement, kind: PartKind, library: Library): void {
  panel
    .querySelector('.ln-ext-src-choices > .ln-ext-src-listing')
    ?.replaceWith(themeListing(kind, library));
  panel
    .querySelector('.ln-ext-src-packs > .ln-ext-src-listing')
    ?.replaceWith(packListing(kind, library));
}

// Signed out, the account pages, and the settings with them, are out of
// reach: the import form comes here instead.
function importFoot(kind: PartKind, library: Library): HTMLElement {
  if (!document.body.dataset.user) return importForm(library);
  return createElement('a', {
    className: 'ln-ext-src-import-link',
    text: `Import a ${NOUNS[kind]}`,
    attrs: { href: packsUrl() },
  });
}

/** The Extension tab's content for a panel's part. */
export function choiceSection(kind: PartKind, library: Library): HTMLElement {
  const section = createElement('div', { className: 'ln-ext-src-choices' });
  const families = FAMILIES.map(family => {
    const themes = themesOf(kind).filter(theme => theme.family === family.id);
    return themes.length > 0
      ? familyView(
          family,
          themes.map(theme => themeItem(kind, theme, library)),
        )
      : null;
  }).filter(view => view !== null);
  section.append(themeListing(kind, library), ...families);
  section.append(...OPTION_ROWS[kind].map(row => row(library)));
  openFamily(section, familyOf(kind, library.current(kind)));
  return section;
}

/** The Packs tab's content: the imported packs that have the part, and how to import one. */
export function importedSection(kind: PartKind, library: Library): HTMLElement {
  const section = createElement('div', { className: 'ln-ext-src-packs' });
  section.append(packListing(kind, library), importFoot(kind, library));
  return section;
}
