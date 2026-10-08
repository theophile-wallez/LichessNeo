import { createElement, setStyleProperty } from '#shared/dom.ts';
import { hasPart, PART_KINDS, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import { importForm } from './import-form.ts';
import type { Library } from './library.ts';

// The extension settings' Packs card (styles/pages/extension-settings.css):
// the imported packs, each with what it holds and a button to remove it, and
// the form that imports one. They're picked in the user menu.

const PART_LABELS: Readonly<Record<PartKind, string>> = {
  board: 'packsPartBoard',
  piece: 'packsPartPieces',
  sound: 'packsPartSounds',
};

function preview(pack: Pack): HTMLElement {
  const thumb = createElement('span', { className: 'cdc-pack__thumb' });
  if (pack.board) setStyleProperty(thumb, 'background-image', `url("${pack.board.image}")`);
  if (pack.pieces) {
    const knight = createElement('span', { className: 'cdc-pack__piece' });
    setStyleProperty(knight, 'background-image', `url("${pack.pieces.wN}")`);
    thumb.append(knight);
  }
  return thumb;
}

function packRow(pack: Pack, library: Library): HTMLElement {
  const row = createElement('div', { className: 'cdc-pack' });
  const parts = PART_KINDS.filter(kind => hasPart(pack, kind)).map(kind =>
    message(PART_LABELS[kind]),
  );
  const text = createElement('div', { className: 'cdc-pack__text' });
  text.append(
    createElement('a', {
      className: 'cdc-pack__name',
      text: pack.name,
      attrs: { href: pack.link, target: '_blank', rel: 'noopener', title: pack.link },
    }),
    createElement('span', { className: 'cdc-pack__parts', text: parts.join(' · ') }),
  );
  const remove = createElement('button', {
    className: 'cdc-pack__remove',
    text: message('packsRemove'),
    attrs: { type: 'button' },
  });
  remove.addEventListener('click', () => void library.remove(pack.id));
  row.append(preview(pack), text, remove);
  return row;
}

function packListing(library: Library): HTMLElement {
  const packs = library.packs();
  if (packs.length === 0) {
    const text = message(library.unreadable() ? 'packsUnreadable' : 'packsEmpty');
    return createElement('p', { className: 'cdc-packs__empty', text });
  }
  const list = createElement('div', { className: 'cdc-packs__list' });
  list.append(...packs.map(pack => packRow(pack, library)));
  return list;
}

/** The Packs card, kept in step with the library: it lists the packs once `loadAll` reads them. */
export function importSection(library: Library): HTMLElement {
  const section = createElement('section', { className: 'cdc-packs' });
  const head = createElement('div', { className: 'cdc-packs__head' });
  const heading = createElement('div', { className: 'cdc-packs__heading' });
  heading.append(
    createElement('h2', { className: 'cdc-setting__title', text: message('packsTitle') }),
    createElement('p', { className: 'cdc-setting__body', text: message('packsBody') }),
  );
  head.append(
    createElement('span', { className: 'cdc-setting__icon', attrs: { 'aria-hidden': 'true' } }),
    heading,
  );
  let listing = packListing(library);
  section.append(head, listing, importForm(library));
  // A listener stays for good: a page draws the section once, again only if Lichess drops it.
  library.onChange(() => {
    const next = packListing(library);
    listing.replaceWith(next);
    listing = next;
  });
  return section;
}
