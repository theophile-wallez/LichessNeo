import { createElement } from '#shared/dom.ts';
import { repositoryPage } from '#shared/repository.ts';
import { message } from '#content/platform/runtime.ts';
import { fetchPacks } from './import.ts';
import { importPack, importState, setStatus, statusLine } from './import-status.ts';
import type { Library } from './library.ts';
import { localZones } from './local-zones.ts';

// The form that imports packs, from a GitHub link or the user's own files,
// in the extension's settings, and in the user menu's panels when signed
// out. A private repository's token is used for that import and never kept:
// the page's storage is Lichess's to read.

const HELP_URL = repositoryPage('docs/packs.md');

// The link stays in its field after a failure, to be fixed.
async function importInto(link: HTMLInputElement, token: string, library: Library): Promise<void> {
  await importPack(async () => {
    const download = await fetchPacks(link.value, token);
    return 'error' in download ? download : { imports: [download] };
  }, library);
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

/** The GitHub link and its token, the zones for the user's files, and what the import said. */
export function importForm(library: Library): HTMLElement {
  const form = createElement('div', { className: 'ln-ext-packs__import' });
  const { row, link, button } = linkRow();
  const token = tokenField();
  const help = createElement('a', {
    className: 'ln-ext-packs__help',
    text: message('packsHelp'),
    attrs: { href: HELP_URL, target: '_blank', rel: 'noopener' },
  });
  form.append(row, token.field, help, ...localZones(library), statusLine());
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
