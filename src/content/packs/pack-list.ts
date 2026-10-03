import { createElement, setStyleProperty } from '#shared/dom.ts';
import { fetchPack } from './import.ts';
import type { Library } from './library.ts';
import { hasPart, type Pack, type PartKind } from '#shared/packs/pack.ts';

// The Imported tab of a panel: the packs that have its part, each with a
// button to remove it, and the form that imports one from a GitHub link. A
// private repository's token is used for that import and never kept: the
// page's storage is Lichess's to read.

export const HELP_URL = 'https://github.com/theophile-wallez/LichessReimagined/blob/main/docs/packs.md';

/** What the last import said, shown again in a panel Lichess draws anew. */
interface ImportState {
  busy: boolean;
  message: string;
  failed: boolean;
}

const importState: ImportState = { busy: false, message: '', failed: false };

function thumbnail(kind: PartKind, pack: Pack): string | null {
  if (kind === 'board') return pack.board?.image ?? null;
  if (kind === 'piece') return pack.pieces?.wN ?? null;
  return null;
}

function packEntry(kind: PartKind, pack: Pack, library: Library): HTMLElement {
  const entry = createElement('div', { className: 'cdc-src-entry' });
  const item = createElement('button', {
    attrs: { type: 'button', class: 'cdc-src-item', 'data-cdc-choice': pack.id, title: pack.link },
  });
  const thumb = createElement('span', { className: 'cdc-src-thumb' });
  const image = thumbnail(kind, pack);
  if (image !== null) setStyleProperty(thumb, 'background-image', `url("${image}")`);
  item.append(thumb, createElement('span', { className: 'cdc-src-name', text: pack.name }));
  item.addEventListener('click', () => library.choose(kind, pack.id));
  const remove = createElement('button', {
    text: '×',
    attrs: {
      type: 'button',
      class: 'cdc-src-remove',
      title: 'Remove this pack',
      'aria-label': 'Remove',
    },
  });
  remove.addEventListener('click', () => void library.remove(pack.id));
  entry.append(item, remove);
  return entry;
}

function statusLine(): HTMLElement {
  const status = createElement('p', {
    className: 'cdc-src-status',
    text: importState.message,
    attrs: { 'aria-live': 'polite' },
  });
  status.classList.toggle('cdc-src-status--failed', importState.failed);
  return status;
}

function setStatus(message: string, failed: boolean): void {
  importState.message = message;
  importState.failed = failed;
  for (const status of document.querySelectorAll('#dasher_app .cdc-src-status')) {
    status.textContent = message;
    status.classList.toggle('cdc-src-status--failed', failed);
  }
}

async function importPack(link: string, token: string, library: Library): Promise<void> {
  importState.busy = true;
  setStatus('Importing…', false);
  try {
    const download = await fetchPack(link, token);
    if ('error' in download) {
      setStatus(download.error, true);
      return;
    }
    await library.add(download.pack);
    setStatus(`Imported “${download.pack.name}”.`, false);
  } catch (error) {
    console.error('[LichessReimagined] pack import failed', error);
    setStatus('The pack could not be imported.', true);
  } finally {
    importState.busy = false;
  }
}

// The link stays in its field after a failure, to be fixed.
async function importInto(link: HTMLInputElement, token: string, library: Library): Promise<void> {
  await importPack(link.value, token, library);
  if (!importState.failed) link.value = '';
}

// A text field masked by CSS, outside any <form>: a password field in a form
// is what browsers offer to save as the site's password.
function tokenField(): { readonly field: HTMLElement; readonly input: HTMLInputElement } {
  const field = createElement('details', { className: 'cdc-src-private' });
  const input = createElement('input', {
    className: 'cdc-src-token',
    attrs: {
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'GitHub token',
      'aria-label': 'GitHub token',
    },
  });
  field.append(
    createElement('summary', { text: 'Private repository?' }),
    input,
    createElement('p', {
      className: 'cdc-src-note',
      text: 'A fine-grained token that can only read this repository’s contents, used for this import and never kept.',
    }),
  );
  return { field, input };
}

function importForm(library: Library): HTMLElement {
  const form = createElement('div', { className: 'cdc-src-import' });
  const row = createElement('div', { className: 'cdc-src-import__row' });
  const link = createElement('input', {
    attrs: {
      type: 'url',
      spellcheck: 'false',
      placeholder: 'Link to a pack on GitHub',
      'aria-label': 'Link to a pack on GitHub',
    },
  });
  const button = createElement('button', { text: 'Import', attrs: { type: 'button' } });
  row.append(link, button);
  const token = tokenField();
  form.append(row, token.field);
  const submit = (): void => {
    if (importState.busy) return;
    if (link.value.trim() === '') {
      setStatus('Paste a link to a pack first.', true);
      return;
    }
    const secret = token.input.value;
    token.input.value = '';
    void importInto(link, secret, library);
  };
  button.addEventListener('click', submit);
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) submit();
  });
  return form;
}

/** The packs with the panel's part, or a line saying there are none. */
function packListing(kind: PartKind, library: Library): HTMLElement {
  const packs = library.packs().filter(pack => hasPart(pack, kind));
  if (packs.length === 0) {
    const text = library.unreadable()
      ? 'The imported packs could not be read.'
      : 'No pack imported yet.';
    return createElement('p', { className: 'cdc-src-empty', text });
  }
  const list = createElement('div', { className: 'cdc-src-list' });
  list.append(...packs.map(pack => packEntry(kind, pack, library)));
  return list;
}

/** Draws the panel's packs again, leaving the form and what's typed in it. */
export function refreshListing(panel: HTMLElement, kind: PartKind, library: Library): void {
  panel
    .querySelector('.cdc-src-packs > :is(.cdc-src-list, .cdc-src-empty)')
    ?.replaceWith(packListing(kind, library));
}

/** The Imported tab's content for a panel's part. */
export function packSection(kind: PartKind, library: Library): HTMLElement {
  const section = createElement('div', { className: 'cdc-src-packs' });
  const help = createElement('a', {
    className: 'cdc-src-help',
    text: 'How to make a pack',
    attrs: { href: HELP_URL, target: '_blank', rel: 'noopener' },
  });
  section.append(packListing(kind, library), importForm(library), statusLine(), help);
  return section;
}
