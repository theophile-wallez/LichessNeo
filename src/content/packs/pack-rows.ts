import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import FileZipIcon from '@hugeicons/core-free-icons/FileZipIcon';
import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';
import { createElement } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { bySource, isFileItem, newestFirst } from '#shared/packs/items.ts';
import { hasPart, PART_KINDS, packTitle, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { parsePackLink, sourceIdOf, sourceLabel } from '#shared/packs/source.ts';
import { message } from '#content/platform/runtime.ts';
import { downloadPack } from './import-form.ts';
import { importPack, importState } from './import-status.ts';
import type { Library } from './library.ts';
import { packThumb } from './pack-thumb.ts';

// The packs imported, on the Packs card: each pack.json once, with where it
// came from (a GitHub repository, or a zip) and what it holds; one from
// GitHub downloads its latest version again on a click.

type Source = readonly [Pack, ...Pack[]];

const PART_LABELS: Readonly<Record<PartKind, readonly [one: string, several: string]>> = {
  board: ['packsPartBoard', 'packsPartBoards'],
  piece: ['packsPartPieces', 'packsPartPieceSets'],
  sound: ['packsPartSounds', 'packsPartSoundSets'],
};

function partsText(packs: readonly Pack[]): string {
  return PART_KINDS.flatMap(kind => {
    const count = packs.filter(pack => hasPart(pack, kind)).length;
    const [one, several] = PART_LABELS[kind];
    if (count === 0) return [];
    return [count === 1 ? message(one) : message(several, String(count))];
  }).join(' · ');
}

function button(className: string, label: string, icon: typeof GithubIcon): HTMLButtonElement {
  const element = createElement('button', {
    className: `ln-ext-pack__button ${className}`,
    attrs: { type: 'button', title: label },
  });
  setHtml(element, hugeicon(icon));
  element.append(createElement('span', { className: 'ln-ext-pack__button-text', text: label }));
  return element;
}

// A private repository's token isn't kept: its pack fails here, and is imported again with it.
function updateButton(link: string, library: Library): HTMLElement {
  const update = button('ln-ext-pack__update', message('packsUpdate'), RefreshIcon);
  update.addEventListener('click', () => {
    if (importState.busy) return;
    update.disabled = true;
    void importPack(() => downloadPack(link, ''), library, 'packsUpdated').finally(() => {
      update.disabled = false;
    });
  });
  return update;
}

/** Where the pack came from: its repository, linked, or a zip. */
function origin(pack: Pack): HTMLElement {
  const source = parsePackLink(pack.link);
  const tag = source
    ? createElement('a', {
        className: 'ln-ext-pack__origin',
        text: sourceLabel(source),
        attrs: { href: pack.link, target: '_blank', rel: 'noopener', title: pack.link },
      })
    : createElement('span', { className: 'ln-ext-pack__origin', text: message('packsFromZip') });
  const icon = createElement('span', { className: 'ln-ext-pack__origin-icon' });
  setHtml(icon, hugeicon(source ? GithubIcon : FileZipIcon));
  tag.prepend(icon);
  return tag;
}

function packRow(packs: Source, library: Library): HTMLElement {
  const [first] = packs;
  const row = createElement('div', { className: 'ln-ext-pack' });
  const text = createElement('div', { className: 'ln-ext-pack__text' });
  const meta = createElement('span', { className: 'ln-ext-pack__meta' });
  meta.append(
    origin(first),
    createElement('span', { className: 'ln-ext-pack__parts', text: partsText(packs) }),
  );
  text.append(
    createElement('span', { className: 'ln-ext-pack__name', text: packTitle(first) }),
    meta,
  );
  const remove = button('ln-ext-pack__remove', message('packsRemove'), Delete02Icon);
  remove.addEventListener('click', () => void library.remove(sourceIdOf(first.id)));
  row.append(packThumb(packs), text);
  if (parsePackLink(first.link)) row.append(updateButton(first.link, library));
  row.append(remove);
  return row;
}

/** The imported packs, the newest first, or what to say while there's none. */
export function packListing(library: Library): HTMLElement {
  const packs = library.packs().filter(pack => !isFileItem(pack));
  if (packs.length === 0) {
    const text = message(library.unreadable() ? 'packsUnreadable' : 'packsEmpty');
    return createElement('p', { className: 'ln-ext-packs__empty', text });
  }
  const list = createElement('div', { className: 'ln-ext-packs__list' });
  list.append(...bySource(newestFirst(packs)).map(source => packRow(source, library)));
  return list;
}
