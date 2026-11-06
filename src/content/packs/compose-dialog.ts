import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import { createElement } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { exportFiles } from '#shared/packs/export.ts';
import { PACK_TOPIC, packRepoName } from '#shared/packs/sharing.ts';
import { createZip } from '#shared/packs/zip.ts';
import { repositoryPage } from '#shared/repository.ts';
import { saveFile } from '#shared/save-file.ts';
import { message } from '#content/platform/runtime.ts';
import { chosenParts, composerGroups, composition, packName } from './composer.ts';
import type { Library } from './library.ts';

// The Packs card's composer, in a dialog over the page
// (styles/pages/settings-packs-compose.css): a pack to share, put together
// from any of the boards, piece sets and sound sets imported (composer.ts),
// under a name, and saved as a zip (shared/packs/export.ts) that anyone can
// drop on their own card, named as the GitHub repository it would be shared
// from (shared/packs/sharing.ts).

const MAX_NAME = 40;
const SHARE_URL = repositoryPage('docs/packs.md#sharing-a-pack');

function button(className: string, text: string): HTMLButtonElement {
  return createElement('button', { className, text, attrs: { type: 'button' } });
}

function head(close: () => void): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-pack-dialog__head' });
  const text = createElement('div', { className: 'ln-ext-pack-dialog__heading' });
  text.append(
    createElement('h2', { className: 'ln-ext-pack-dialog__title', text: message('packsCompose') }),
    createElement('p', {
      className: 'ln-ext-pack-dialog__hint',
      text: message('packsComposeHint'),
    }),
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

function nameField(refresh: () => void): HTMLElement {
  const box = createElement('label', { className: 'ln-ext-pack-dialog__name' });
  const field = createElement('input', {
    attrs: {
      type: 'text',
      value: composition.name ?? message('packsComposeDefault'),
      maxlength: String(MAX_NAME),
      spellcheck: 'false',
      placeholder: message('packsComposeName'),
    },
  });
  field.addEventListener('input', () => {
    composition.name = field.value;
    refresh();
  });
  box.append(
    createElement('span', {
      className: 'ln-ext-pack-dialog__label',
      text: message('packsComposeName'),
    }),
    field,
  );
  return box;
}

function shareRow(label: string, value: HTMLElement): HTMLElement {
  const row = createElement('div', { className: 'ln-ext-compose__share-row' });
  row.append(
    createElement('span', { className: 'ln-ext-compose__share-label', text: label }),
    value,
  );
  return row;
}

// How to share the pack so others find it, with the repository's name it takes.
function shareBox(repo: HTMLElement): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-compose__share' });
  const title = createElement('span', { className: 'ln-ext-compose__share-title' });
  setHtml(title, hugeicon(GithubIcon));
  title.append(message('packsShareTitle'));
  box.append(
    title,
    createElement('p', { className: 'ln-ext-compose__hint', text: message('packsShareHint') }),
    shareRow(message('packsShareRepo'), repo),
    shareRow(
      message('packsShareTopic'),
      createElement('code', { className: 'ln-ext-compose__code', text: PACK_TOPIC }),
    ),
    createElement('a', {
      className: 'ln-ext-compose__share-help',
      text: message('packsShareHelp'),
      attrs: { href: SHARE_URL, target: '_blank', rel: 'noopener' },
    }),
  );
  return box;
}

function foot(library: Library, close: () => void): { box: HTMLElement; save: HTMLButtonElement } {
  const box = createElement('div', { className: 'ln-ext-pack-dialog__foot' });
  const cancel = button('ln-ext-pack-dialog__cancel', message('packsDialogCancel'));
  const save = button('ln-ext-pack-dialog__confirm', message('packsComposeExport'));
  cancel.addEventListener('click', close);
  save.addEventListener('click', () => {
    const parts = chosenParts(library);
    const name = packName();
    if (name === '' || parts.length === 0) return;
    saveFile(createZip(exportFiles({ name, parts })), `${packRepoName(name)}.zip`);
    close();
  });
  box.append(createElement('span', { className: 'ln-ext-pack-dialog__status' }), cancel, save);
  return { box, save };
}

/** Opens the composer over the page. */
export function openComposer(library: Library): void {
  const dialog = createElement('dialog', {
    className: 'ln-ext-pack-dialog ln-ext-pack-dialog--compose',
  });
  const close = (): void => dialog.close();
  const card = createElement('div', { className: 'ln-ext-pack-dialog__card' });
  const repo = createElement('code', { className: 'ln-ext-compose__code' });
  const { box, save } = foot(library, close);
  const refresh = (): void => {
    save.disabled = packName() === '' || chosenParts(library).length === 0;
    repo.textContent = packRepoName(packName());
  };
  const body = createElement('div', { className: 'ln-ext-pack-dialog__body' });
  body.append(...composerGroups(library, refresh), shareBox(repo));
  card.append(head(close), nameField(refresh), body, box);
  dialog.append(card);
  dialog.addEventListener('click', event => {
    // A click on the backdrop lands on the dialog itself, outside its card.
    if (event.target === dialog) close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  refresh();
  dialog.showModal();
}

/** The card's button that opens the composer, shown once there's something to put in a pack. */
export function composeButton(library: Library): HTMLElement {
  const open = createElement('button', {
    className: 'ln-ext-packs__compose',
    attrs: { type: 'button' },
  });
  open.append(
    createElement('span', {
      className: 'ln-ext-packs__compose-icon',
      attrs: { 'aria-hidden': 'true' },
    }),
    createElement('span', {
      className: 'ln-ext-packs__compose-title',
      text: message('packsCompose'),
    }),
    createElement('span', {
      className: 'ln-ext-packs__compose-hint',
      text: message('packsComposeOpen'),
    }),
  );
  const toggle = (): void => {
    open.hidden = library.packs().length === 0;
  };
  open.addEventListener('click', () => openComposer(library));
  library.onChange(toggle);
  toggle();
  return open;
}
