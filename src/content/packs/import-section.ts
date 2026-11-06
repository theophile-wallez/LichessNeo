import { createElement } from '#shared/dom.ts';
import { isFileItem, kindOf } from '#shared/packs/items.ts';
import { hasPart, PART_KINDS, packTitle, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { sourceIdOf } from '#shared/packs/source.ts';
import { message } from '#content/platform/runtime.ts';
import { composer } from './composer.ts';
import { importForm } from './import-form.ts';
import type { Library } from './library.ts';
import { packThumb } from './pack-thumb.ts';

// The extension settings' Packs card (styles/pages/settings-packs.css): the
// imported packs, each pack.json once with what it holds, then each of the
// user's own boards, piece sets and sound sets under a name they can change;
// the form that imports more, and the composer that exports a pack of them.
// They're picked in the user menu.

type Source = readonly [Pack, ...Pack[]];

const PART_LABELS: Readonly<Record<PartKind, readonly [one: string, several: string]>> = {
  board: ['packsPartBoard', 'packsPartBoards'],
  piece: ['packsPartPieces', 'packsPartPieceSets'],
  sound: ['packsPartSounds', 'packsPartSoundSets'],
};

function bySource(packs: readonly Pack[]): Source[] {
  const sources = new Map<string, [Pack, ...Pack[]]>();
  for (const pack of packs) {
    const source = sources.get(sourceIdOf(pack.id));
    if (source) source.push(pack);
    else sources.set(sourceIdOf(pack.id), [pack]);
  }
  return [...sources.values()];
}

function partsText(packs: readonly Pack[]): string {
  return PART_KINDS.flatMap(kind => {
    const count = packs.filter(pack => hasPart(pack, kind)).length;
    const [one, several] = PART_LABELS[kind];
    if (count === 0) return [];
    return [count === 1 ? message(one) : message(several, String(count))];
  }).join(' · ');
}

function removeButton(source: string, library: Library): HTMLElement {
  const button = createElement('button', {
    className: 'ln-ext-pack__button ln-ext-pack__remove',
    text: message('packsRemove'),
    attrs: { type: 'button' },
  });
  button.addEventListener('click', () => void library.remove(source));
  return button;
}

function packRow(packs: Source, library: Library): HTMLElement {
  const [first] = packs;
  const row = createElement('div', { className: 'ln-ext-pack' });
  const text = createElement('div', { className: 'ln-ext-pack__text' });
  // A pack from a zip has no link.
  const name =
    first.link === ''
      ? createElement('span', { className: 'ln-ext-pack__name', text: packTitle(first) })
      : createElement('a', {
          className: 'ln-ext-pack__name',
          text: packTitle(first),
          attrs: { href: first.link, target: '_blank', rel: 'noopener', title: first.link },
        });
  text.append(
    name,
    createElement('span', { className: 'ln-ext-pack__parts', text: partsText(packs) }),
  );
  row.append(packThumb(packs), text, removeButton(sourceIdOf(first.id), library));
  return row;
}

// Stored once the field is left or Enter pressed; emptied, it shows the name again.
function nameField(item: Pack, library: Library): HTMLInputElement {
  const field = createElement('input', {
    className: 'ln-ext-pack__rename',
    attrs: {
      type: 'text',
      value: item.name,
      maxlength: '40',
      spellcheck: 'false',
      'aria-label': message('packsRename'),
      title: message('packsRename'),
    },
  });
  field.addEventListener('change', () => {
    if (field.value.trim() === '') field.value = item.name;
    else void library.rename(item.id, field.value);
  });
  field.addEventListener('keydown', event => {
    if (event.key === 'Enter') field.blur();
  });
  return field;
}

function itemRow(item: Pack, library: Library): HTMLElement {
  const row = createElement('div', { className: 'ln-ext-pack ln-ext-pack--item' });
  const text = createElement('div', { className: 'ln-ext-pack__text' });
  text.append(
    nameField(item, library),
    createElement('span', { className: 'ln-ext-pack__parts', text: partsText([item]) }),
  );
  row.append(packThumb([item]), text, removeButton(item.id, library));
  return row;
}

// The user's own items after the packs, boards first, then pieces, then sounds.
const itemOrder = (item: Pack): number => PART_KINDS.indexOf(kindOf(item) ?? 'board');

function packListing(library: Library): HTMLElement {
  const packs = library.packs();
  if (packs.length === 0) {
    const text = message(library.unreadable() ? 'packsUnreadable' : 'packsEmpty');
    return createElement('p', { className: 'ln-ext-packs__empty', text });
  }
  const list = createElement('div', { className: 'ln-ext-packs__list' });
  const items = packs
    .filter(isFileItem)
    .toSorted((left, right) => itemOrder(left) - itemOrder(right));
  list.append(
    ...bySource(packs.filter(pack => !isFileItem(pack))).map(source => packRow(source, library)),
    ...items.map(item => itemRow(item, library)),
  );
  return list;
}

function head(): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-packs__head' });
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
  box.append(
    createElement('span', { className: 'ln-ext-setting__icon', attrs: { 'aria-hidden': 'true' } }),
    heading,
  );
  return box;
}

/** The Packs card, kept in step with the library: it lists the packs once `loadAll` reads them. */
export function importSection(library: Library): HTMLElement {
  const section = createElement('section', { className: 'ln-ext-packs' });
  let listing = packListing(library);
  let compose = composer(library);
  section.append(head(), listing, importForm(library), compose);
  // A listener stays for good: a page draws the section once, again only if Lichess drops it.
  library.onChange(() => {
    const next = packListing(library);
    listing.replaceWith(next);
    listing = next;
    const nextCompose = composer(library);
    compose.replaceWith(nextCompose);
    compose = nextCompose;
  });
  return section;
}
