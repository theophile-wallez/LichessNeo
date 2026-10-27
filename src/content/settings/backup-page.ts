import FileExportIcon from '@hugeicons/core-free-icons/FileExportIcon';
import FileImportIcon from '@hugeicons/core-free-icons/FileImportIcon';
import { closestTo, createElement, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { packTitle } from '#shared/packs/pack.ts';
import { type Backup, backupFileName, readBackup } from './backup-file.ts';
import { createBackup, restoreBackup } from './backup.ts';

// The settings' Backup page: a card that saves every setting to a file, and
// one that puts a file's back, the user's or another player's, once they've
// seen what it holds.

// A backup with a few packs weighs a few megabytes: past this, it isn't one.
const MAX_FILE_SIZE = 200_000_000;

const REVOKE_DELAY = 60_000;

type Action = 'export' | 'choose' | 'restore' | 'cancel';

const actionButton = (action: Action, className: string, text: string, icon?: SafeHtml): SafeHtml =>
  html`<button type="button" class="button ${className}" data-ln-ext-backup-action="${action}">
    ${icon ?? ''}<span>${text}</span>
  </button>`;

const importExtras = (): SafeHtml =>
  html`<input type="file" class="ln-ext-backup__file" accept=".json,application/json" hidden />
    <div class="ln-ext-backup__confirm" hidden>
      <p class="ln-ext-backup__summary"></p>
      <div class="ln-ext-backup__actions">
        ${actionButton('restore', '', message('backupRestore'))}
        ${actionButton('cancel', 'button-empty', message('backupCancel'))}
      </div>
    </div>
    <p class="ln-ext-backup__status" role="status" hidden></p>`;

interface Card {
  readonly kind: 'backupExport' | 'backupImport';
  readonly title: string;
  readonly body: string;
  readonly button: SafeHtml;
  /** Under the text: what the card shows as it's used. */
  readonly extras?: SafeHtml;
}

const cardMarkup = ({ kind, title, body, button, extras }: Card): SafeHtml =>
  html`<div class="ln-ext-setting ln-ext-backup" data-ln-ext-setting="${kind}" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title">${title}</h2>
      <p class="ln-ext-setting__body">${body}</p>
      ${extras ?? ''}
    </div>
    ${button}
  </div>`;

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  // Firefox follows a link's download only while it's in the document.
  const link = createElement('a', { attrs: { href: url, download: name } });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked at once, the file may not be read yet: Firefox then saves nothing.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY);
}

/** What the file holds, to be read before it replaces anything. */
function summary(backup: Backup): string {
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' });
  const made = message('backupSummary', date.format(new Date(backup.created)));
  const packs = [...new Set(backup.packs.map(packTitle))].join(', ');
  return packs ? `${made} ${message('backupSummaryPacks', packs)}` : made;
}

interface Parts {
  readonly file: HTMLInputElement;
  readonly confirm: HTMLElement;
  readonly summary: HTMLElement;
  readonly status: HTMLElement;
}

function partsOf(page: HTMLElement): Parts | null {
  const file = queryOne(page, '.ln-ext-backup__file', HTMLInputElement);
  const confirm = queryOne(page, '.ln-ext-backup__confirm', HTMLElement);
  const summaryText = queryOne(page, '.ln-ext-backup__summary', HTMLElement);
  const status = queryOne(page, '.ln-ext-backup__status', HTMLElement);
  return file && confirm && summaryText && status
    ? { file, confirm, summary: summaryText, status }
    : null;
}

function showStatus({ status }: Parts, text: string | null): void {
  status.textContent = text ?? '';
  status.hidden = text === null;
}

async function exportSettings(parts: Parts): Promise<void> {
  try {
    const backup = await createBackup();
    download(JSON.stringify(backup, null, 2), backupFileName(new Date(backup.created)));
  } catch (error) {
    console.error('[LichessNeo] settings not exported', error);
    showStatus(parts, message('backupExportFailed'));
  }
}

async function readFile(parts: Parts): Promise<Backup | null> {
  const file = parts.file.files?.[0];
  // Picked again, the same file fires a change.
  parts.file.value = '';
  if (!file) return null;
  const backup = file.size <= MAX_FILE_SIZE ? readBackup(await file.text()) : null;
  showStatus(parts, backup ? null : message('backupInvalid'));
  return backup;
}

/** The page's two cards. */
export function buildBackupPage(): HTMLElement {
  const page = createElement('div', { className: 'ln-ext-settings__list' });
  setHtml(
    page,
    html`${cardMarkup({
      kind: 'backupExport',
      title: message('backupExportTitle'),
      body: message('backupExportBody'),
      button: actionButton('export', '', message('backupExport'), hugeicon(FileExportIcon)),
    })}${cardMarkup({
      kind: 'backupImport',
      title: message('backupImportTitle'),
      body: message('backupImportBody'),
      button: actionButton('choose', '', message('backupImport'), hugeicon(FileImportIcon)),
      extras: importExtras(),
    })}`,
  );
  const parts = partsOf(page);
  if (!parts) return page;
  let picked: Backup | null = null;
  const pick = (backup: Backup | null): void => {
    picked = backup;
    parts.confirm.hidden = backup === null;
    parts.summary.textContent = backup ? summary(backup) : '';
  };
  const restore = async (backup: Backup): Promise<void> => {
    try {
      await restoreBackup(backup);
      // Every feature reads its picks again, as the page loads.
      location.reload();
    } catch (error) {
      console.error('[LichessNeo] settings not restored', error);
      showStatus(parts, message('backupRestoreFailed'));
    }
  };
  parts.file.addEventListener('change', () => void readFile(parts).then(pick));
  page.addEventListener('click', event => {
    const action = closestTo(event.target, '[data-ln-ext-backup-action]', HTMLButtonElement)
      ?.dataset.lnExtBackupAction;
    if (action === 'export') void exportSettings(parts);
    else if (action === 'choose') parts.file.click();
    else if (action === 'restore' && picked) void restore(picked);
    else if (action === 'cancel') pick(null);
  });
  return page;
}
