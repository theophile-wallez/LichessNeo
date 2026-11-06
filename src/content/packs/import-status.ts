import { createElement } from '#shared/dom.ts';
import { packTitle } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import type { Library } from './library.ts';
import type { Imports } from './local-import.ts';

// What the Packs card's imports say, from a link or the user's own files, in
// one line under the form, kept for a card drawn anew.

/** What the last import said, shown again in a section drawn anew. */
interface ImportState {
  busy: boolean;
  message: string;
  failed: boolean;
}

export const importState: ImportState = { busy: false, message: '', failed: false };

export function statusLine(): HTMLElement {
  const status = createElement('p', {
    className: 'ln-ext-packs__status',
    text: importState.message,
    attrs: { 'aria-live': 'polite' },
  });
  status.classList.toggle('ln-ext-packs__status--failed', importState.failed);
  return status;
}

export function setStatus(text: string, failed: boolean): void {
  importState.message = text;
  importState.failed = failed;
  for (const status of document.querySelectorAll('.ln-ext-packs__status')) {
    status.textContent = text;
    status.classList.toggle('ln-ext-packs__status--failed', failed);
  }
}

export async function importPack(read: () => Promise<Imports>, library: Library): Promise<void> {
  importState.busy = true;
  setStatus(message('packsImporting'), false);
  try {
    const download = await read();
    if ('error' in download) {
      setStatus(download.error, true);
      return;
    }
    for (const { packs, source } of download.imports) await library.add(packs, source);
    const first = download.imports[0]?.packs[0];
    setStatus(message('packsImported', first ? packTitle(first) : ''), false);
  } catch (error) {
    console.error('[LichessNeo] pack import failed', error);
    setStatus(message('packsImportFailed'), true);
  } finally {
    importState.busy = false;
  }
}
