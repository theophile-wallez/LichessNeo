import { createElement, setStyleProperty } from '#shared/dom.ts';
import { hasPart, PART_KINDS, packTitle, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { sourceIdOf } from '#shared/packs/source.ts';
import { message } from '#content/platform/runtime.ts';
import { importForm } from './import-form.ts';
import type { Library } from './library.ts';

// The extension settings' Packs card (styles/pages/settings-packs.css):
// the imported packs, each pack.json once with what it holds and a button to
// remove it, and the form that imports one. They're picked in the user menu.

const PART_LABELS: Readonly<Record<PartKind, readonly [one: string, several: string]>> = {
  board: ['packsPartBoard', 'packsPartBoards'],
  piece: ['packsPartPieces', 'packsPartPieceSets'],
  sound: ['packsPartSounds', 'packsPartSoundSets'],
};

/** The packs one pack.json gave, listed as one. */
type Source = readonly [Pack, ...Pack[]];

function bySource(packs: readonly Pack[]): Source[] {
  const sources = new Map<string, [Pack, ...Pack[]]>();
  for (const pack of packs) {
    const source = sources.get(sourceIdOf(pack.id));
    if (source) source.push(pack);
    else sources.set(sourceIdOf(pack.id), [pack]);
  }
  return [...sources.values()];
}

function partsText(packs: Source): string {
  return PART_KINDS.flatMap(kind => {
    const count = packs.filter(pack => hasPart(pack, kind)).length;
    const [one, several] = PART_LABELS[kind];
    if (count === 0) return [];
    return [count === 1 ? message(one) : message(several, String(count))];
  }).join(' · ');
}

function preview(packs: Source): HTMLElement {
  const thumb = createElement('span', { className: 'ln-ext-pack__thumb' });
  const board = packs.find(pack => pack.board)?.board;
  const pieces = packs.find(pack => pack.pieces)?.pieces;
  if (board) setStyleProperty(thumb, 'background-image', `url("${board.image}")`);
  if (pieces) {
    const knight = createElement('span', { className: 'ln-ext-pack__piece' });
    setStyleProperty(knight, 'background-image', `url("${pieces.wN}")`);
    thumb.append(knight);
  }
  return thumb;
}

function packRow(packs: Source, library: Library): HTMLElement {
  const [first] = packs;
  const row = createElement('div', { className: 'ln-ext-pack' });
  const text = createElement('div', { className: 'ln-ext-pack__text' });
  text.append(
    createElement('a', {
      className: 'ln-ext-pack__name',
      text: packTitle(first),
      attrs: { href: first.link, target: '_blank', rel: 'noopener', title: first.link },
    }),
    createElement('span', { className: 'ln-ext-pack__parts', text: partsText(packs) }),
  );
  const remove = createElement('button', {
    className: 'ln-ext-pack__remove',
    text: message('packsRemove'),
    attrs: { type: 'button' },
  });
  remove.addEventListener('click', () => void library.remove(sourceIdOf(first.id)));
  row.append(preview(packs), text, remove);
  return row;
}

function packListing(library: Library): HTMLElement {
  const packs = library.packs();
  if (packs.length === 0) {
    const text = message(library.unreadable() ? 'packsUnreadable' : 'packsEmpty');
    return createElement('p', { className: 'ln-ext-packs__empty', text });
  }
  const list = createElement('div', { className: 'ln-ext-packs__list' });
  list.append(...bySource(packs).map(source => packRow(source, library)));
  return list;
}

/** The Packs card, kept in step with the library: it lists the packs once `loadAll` reads them. */
export function importSection(library: Library): HTMLElement {
  const section = createElement('section', { className: 'ln-ext-packs' });
  const head = createElement('div', { className: 'ln-ext-packs__head' });
  const heading = createElement('div', { className: 'ln-ext-packs__heading' });
  const title = createElement('h2', {
    className: 'ln-ext-setting__title',
    text: message('packsTitle'),
  });
  title.append(createElement('span', { className: 'ln-ext-beta', text: message('packsBeta') }));
  heading.append(
    title,
    createElement('p', { className: 'ln-ext-setting__body', text: message('packsBody') }),
  );
  head.append(
    createElement('span', { className: 'ln-ext-setting__icon', attrs: { 'aria-hidden': 'true' } }),
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
