import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { createElement } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { itemNamed } from '#shared/packs/items.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import type { Pack, PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import type { Library } from './library.ts';
import { droppedFiles } from './local-files.ts';

// The dialog the files dropped on a zone open in, before anything is
// imported (styles/pages/settings-packs-dialog.css): the item's name, which
// it must be given, then its slots (dialog-slots.ts), to see what each file
// went in and to fill the rest, one file at a time. An item already imported
// opens in it too, with its files, to change some of them or its name.

export interface DialogBody {
  readonly element: HTMLElement;
  /** What still stops the import, or null once it can go. */
  readonly missing: () => string | null;
  /** The files, named as the import of the zone's kind wants them. */
  readonly files: () => readonly LocalFile[];
  /** Files dropped on the dialog, not on a slot. */
  readonly add: (files: readonly LocalFile[]) => void;
  readonly onChange: (listener: () => void) => void;
  readonly dispose: () => void;
}

export interface DialogOptions {
  readonly kind: PartKind;
  readonly body: DialogBody;
  readonly library: Library;
  /** The item edited, whose files the body holds; else the files are a new item. */
  readonly editing?: Pack;
  /** Imports the files under the name: what went wrong, or null once it's done. */
  readonly confirm: (name: string, files: readonly LocalFile[]) => Promise<string | null>;
}

const TEXTS: Readonly<Record<PartKind, readonly [title: string, name: string, hint: string]>> = {
  piece: ['packsDialogPieces', 'packsDialogNamePieces', 'packsDialogPiecesHint'],
  board: ['packsDialogBoard', 'packsDialogNameBoard', 'packsDialogBoardHint'],
  sound: ['packsDialogSounds', 'packsDialogNameSounds', 'packsDialogSoundsHint'],
};

const EDIT_TITLES: Readonly<Record<PartKind, string>> = {
  piece: 'packsDialogEditPieces',
  board: 'packsDialogEditBoard',
  sound: 'packsDialogEditSounds',
};

function button(className: string, text: string): HTMLButtonElement {
  return createElement('button', { className, text, attrs: { type: 'button' } });
}

function head({ kind, editing }: DialogOptions, close: () => void): HTMLElement {
  const [imported, , hint] = TEXTS[kind];
  const title = editing ? EDIT_TITLES[kind] : imported;
  const box = createElement('div', { className: 'ln-ext-pack-dialog__head' });
  const text = createElement('div', { className: 'ln-ext-pack-dialog__heading' });
  text.append(
    createElement('h2', { className: 'ln-ext-pack-dialog__title', text: message(title) }),
    createElement('p', { className: 'ln-ext-pack-dialog__hint', text: message(hint) }),
  );
  const shut = createElement('button', {
    className: 'ln-ext-pack-dialog__close',
    attrs: { type: 'button', 'aria-label': message('packsDialogClose') },
  });
  setHtml(shut, hugeicon(Cancel01Icon));
  shut.addEventListener('click', close);
  box.append(
    createElement('span', {
      className: 'ln-ext-packs__drop-icon',
      attrs: { 'aria-hidden': 'true' },
    }),
    text,
    shut,
  );
  return box;
}

interface NameField {
  readonly box: HTMLElement;
  readonly input: HTMLInputElement;
  /** Says whether the name replaces one of the user's own. */
  readonly check: () => void;
  /** Why the name can't be kept: an item edited can't take another's. */
  readonly taken: () => string | null;
}

function nameField({ kind, library, editing }: DialogOptions): NameField {
  const box = createElement('label', { className: 'ln-ext-pack-dialog__name' });
  const input = createElement('input', {
    attrs: {
      type: 'text',
      required: '',
      value: editing?.name ?? '',
      maxlength: '40',
      spellcheck: 'false',
      placeholder: message(TEXTS[kind][1]),
    },
  });
  const note = createElement('span', { className: 'ln-ext-pack-dialog__replaces' });
  box.append(
    createElement('span', {
      className: 'ln-ext-pack-dialog__label',
      text: message('packsDialogName'),
    }),
    input,
    note,
  );
  const other = (): Pack | undefined => {
    const named = itemNamed(library.packs(), { kind, name: input.value });
    return named?.id === editing?.id ? undefined : named;
  };
  const check = (): void => {
    const replaced = editing ? undefined : other();
    note.textContent = replaced ? message('packsDialogReplaces', replaced.name) : '';
  };
  const taken = (): string | null => {
    const named = editing && other();
    return named ? message('packsDialogTaken', named.name) : null;
  };
  return { box, input, check, taken };
}

interface Parts {
  readonly dialog: HTMLDialogElement;
  readonly name: NameField;
  readonly status: HTMLElement;
  readonly confirm: HTMLButtonElement;
}

function build(options: DialogOptions): Parts {
  const { kind, body } = options;
  const dialog = createElement('dialog', {
    className: `ln-ext-pack-dialog ln-ext-pack-dialog--${kind}`,
  });
  const card = createElement('div', { className: 'ln-ext-pack-dialog__card' });
  const name = nameField(options);
  const status = createElement('p', {
    className: 'ln-ext-pack-dialog__status',
    attrs: { 'aria-live': 'polite' },
  });
  const cancel = button('ln-ext-pack-dialog__cancel', message('packsDialogCancel'));
  const confirm = button(
    'ln-ext-pack-dialog__confirm',
    message(options.editing ? 'packsDialogSave' : 'packsDialogImport'),
  );
  cancel.addEventListener('click', () => dialog.close());
  const foot = createElement('div', { className: 'ln-ext-pack-dialog__foot' });
  foot.append(status, cancel, confirm);
  card.append(
    head(options, () => dialog.close()),
    name.box,
    body.element,
    foot,
  );
  dialog.append(card);
  dialog.addEventListener('click', event => {
    // A click on the backdrop lands on the dialog itself, outside its card.
    if (event.target === dialog) dialog.close();
  });
  return { dialog, name, status, confirm };
}

/** What the import said, or why it can't go yet; an error stays until something changes. */
function statusOf({ name, status, confirm }: Parts, body: DialogBody) {
  let failed = false;
  const refresh = (): void => {
    const missing =
      name.input.value.trim() === ''
        ? message('packsDialogNoName')
        : (name.taken() ?? body.missing());
    confirm.disabled = missing !== null;
    if (!failed) status.textContent = missing ?? '';
    status.classList.toggle('ln-ext-pack-dialog__status--failed', failed);
  };
  const fail = (text: string): void => {
    failed = true;
    status.textContent = text;
    refresh();
  };
  const changed = (): void => {
    failed = false;
    refresh();
  };
  return { refresh, fail, changed };
}

async function dropOn(body: DialogBody, transfer: DataTransfer, fail: (text: string) => void) {
  try {
    body.add(await droppedFiles(transfer));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    fail(error.message);
  }
}

/** Opens the dialog over the page; settles once it's closed, imported or not. */
export function openImportDialog(options: DialogOptions): Promise<void> {
  const { body } = options;
  const parts = build(options);
  const { dialog, name, status, confirm } = parts;
  const { refresh, fail, changed } = statusOf(parts, body);
  name.input.addEventListener('input', () => {
    name.check();
    changed();
  });
  body.onChange(changed);
  const submit = async (): Promise<void> => {
    confirm.disabled = true;
    status.textContent = message(options.editing ? 'packsDialogSaving' : 'packsImporting');
    const error = await options.confirm(name.input.value.trim(), body.files());
    if (error === null) dialog.close();
    else fail(error);
  };
  confirm.addEventListener('click', () => void submit());
  name.input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !confirm.disabled) void submit();
  });
  dialog.addEventListener('dragover', event => event.preventDefault());
  dialog.addEventListener('drop', event => {
    event.preventDefault();
    if (event.dataTransfer?.files.length) void dropOn(body, event.dataTransfer, fail);
  });
  document.body.append(dialog);
  refresh();
  dialog.showModal();
  name.input.focus();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      body.dispose();
      dialog.remove();
      resolve();
    });
  });
}
