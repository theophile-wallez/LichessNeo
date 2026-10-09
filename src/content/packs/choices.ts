import { createElement, setData, setStyleProperty } from '#shared/dom.ts';
import { hasPart, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { SETTINGS_URL } from '#content/settings/address.ts';
import type { Library } from './library.ts';
import { THEMES, type Theme } from './themes.ts';

// The Extension tab of a panel: the extension's themes for its part, then the
// imported packs that have it. Packs are imported and removed in the
// extension's settings, which a link at the foot leads to.

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
    attrs: { type: 'button', class: 'lr-ext-src-item', 'data-lr-ext-choice': id },
  });
  if (kind === 'sound')
    item.append(createElement('span', { className: 'lr-ext-src-name', text: name }));
  else {
    item.title = name;
    item.setAttribute('aria-label', name);
    const thumb = createElement('span', { className: 'lr-ext-src-thumb' });
    if (image === null) setData(thumb, 'lrExtTheme', id);
    else setStyleProperty(thumb, 'background-image', `url("${image}")`);
    item.append(thumb);
  }
  item.addEventListener('click', () => library.choose(kind, id));
  return item;
}

const themeItem = (kind: PartKind, { id, name }: Theme, library: Library): HTMLElement =>
  choiceItem({ kind, id, name, image: null }, library);

const packItem = (kind: PartKind, pack: Pack, library: Library): HTMLElement =>
  choiceItem({ kind, id: pack.id, name: pack.name, image: thumbnail(kind, pack) }, library);

/** The part's themes and packs, and a line if there are none or the packs can't be read. */
function choiceListing(kind: PartKind, library: Library): HTMLElement {
  const listing = createElement('div', { className: 'lr-ext-src-listing' });
  const packs = library.packs().filter(pack => hasPart(pack, kind));
  const items = [
    ...THEMES[kind].map(theme => themeItem(kind, theme, library)),
    ...packs.map(pack => packItem(kind, pack, library)),
  ];
  if (items.length > 0) {
    const list = createElement('div', { className: 'lr-ext-src-list' });
    list.append(...items);
    listing.append(list);
  }
  const note = library.unreadable()
    ? 'The imported packs could not be read.'
    : `No ${NOUNS[kind]} of the extension yet: import your own from GitHub.`;
  if (library.unreadable() || items.length === 0)
    listing.append(createElement('p', { className: 'lr-ext-src-empty', text: note }));
  return listing;
}

/** Draws the panel's choices again, as packs are read, imported or removed. */
export function refreshListing(panel: HTMLElement, kind: PartKind, library: Library): void {
  panel
    .querySelector('.lr-ext-src-choices > .lr-ext-src-listing')
    ?.replaceWith(choiceListing(kind, library));
}

/** The Extension tab's content for a panel's part. */
export function choiceSection(kind: PartKind, library: Library): HTMLElement {
  const section = createElement('div', { className: 'lr-ext-src-choices' });
  const settings = createElement('a', {
    className: 'lr-ext-src-import-link',
    text: `Import a ${NOUNS[kind]}`,
    attrs: { href: SETTINGS_URL },
  });
  section.append(choiceListing(kind, library), settings);
  return section;
}
