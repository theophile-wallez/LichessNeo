import { createElement } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';
import { fetchPack } from './import.ts';
import type { Library } from './library.ts';

// The form that imports a pack from a GitHub link, in the extension's
// settings. A private repository's token is used for that import and never
// kept: the page's storage is Lichess's to read.

export const HELP_URL = 'https://github.com/theophile-wallez/LichessNeo/blob/main/docs/packs.md';

/** What the last import said, shown again in a section drawn anew. */
interface ImportState {
  busy: boolean;
  message: string;
  failed: boolean;
}

const importState: ImportState = { busy: false, message: '', failed: false };

function statusLine(): HTMLElement {
  const status = createElement('p', {
    className: 'ln-ext-packs__status',
    text: importState.message,
    attrs: { 'aria-live': 'polite' },
  });
  status.classList.toggle('ln-ext-packs__status--failed', importState.failed);
  return status;
}

function setStatus(text: string, failed: boolean): void {
  importState.message = text;
  importState.failed = failed;
  for (const status of document.querySelectorAll('.ln-ext-packs__status')) {
    status.textContent = text;
    status.classList.toggle('ln-ext-packs__status--failed', failed);
  }
}

async function importPack(link: string, token: string, library: Library): Promise<void> {
  importState.busy = true;
  setStatus(message('packsImporting'), false);
  try {
    const download = await fetchPack(link, token);
    if ('error' in download) {
      setStatus(download.error, true);
      return;
    }
    await library.add(download.pack);
    setStatus(message('packsImported', download.pack.name), false);
  } catch (error) {
    console.error('[LichessNeo] pack import failed', error);
    setStatus(message('packsImportFailed'), true);
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
  const field = createElement('details', { className: 'ln-ext-packs__private' });
  const input = createElement('input', {
    className: 'ln-ext-packs__token',
    attrs: {
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: message('packsToken'),
      'aria-label': message('packsToken'),
    },
  });
  field.append(
    createElement('summary', { text: message('packsPrivate') }),
    input,
    createElement('p', { className: 'ln-ext-packs__note', text: message('packsTokenNote') }),
  );
  return { field, input };
}

interface LinkRow {
  readonly row: HTMLElement;
  readonly link: HTMLInputElement;
  readonly button: HTMLButtonElement;
}

function linkRow(): LinkRow {
  const row = createElement('div', { className: 'ln-ext-packs__row' });
  const link = createElement('input', {
    attrs: {
      type: 'url',
      spellcheck: 'false',
      placeholder: message('packsLink'),
      'aria-label': message('packsLink'),
    },
  });
  const button = createElement('button', {
    text: message('packsImport'),
    attrs: { type: 'button' },
  });
  row.append(link, button);
  return { row, link, button };
}

/** The link to import, the token of a private repository, and what the import said. */
export function importForm(library: Library): HTMLElement {
  const form = createElement('div', { className: 'ln-ext-packs__import' });
  const { row, link, button } = linkRow();
  const token = tokenField();
  const help = createElement('a', {
    className: 'ln-ext-packs__help',
    text: message('packsHelp'),
    attrs: { href: HELP_URL, target: '_blank', rel: 'noopener' },
  });
  form.append(row, token.field, statusLine(), help);
  const submit = (): void => {
    if (importState.busy) return;
    if (link.value.trim() === '') {
      setStatus(message('packsNoLink'), true);
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
