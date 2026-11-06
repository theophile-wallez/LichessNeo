import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import { createElement } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { assignSounds } from '#shared/packs/assign.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import { createSlots, type Slots } from '#shared/packs/slots.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import { message } from '#content/platform/runtime.ts';
import { addButton, type Aside, asideList, renamedFile, slotTarget } from './dialog-slots.ts';
import { fileUrls, type FileUrls } from './file-urls.ts';
import type { DialogBody } from './import-dialog.ts';

// The sounds' slots in the import dialog: a row for each sound a set may
// have, with what it plays on; a set needs only some, Lichess's playing the rest.

const ACCEPT = 'audio/*';

interface Drawn {
  readonly slots: Slots<SoundName, LocalFile>;
  readonly urls: FileUrls;
  readonly aside: Aside<LocalFile>;
}

/** `move-self` is told by `packsSoundMoveSelf`. */
export const describedBy = (sound: SoundName): string =>
  `packsSound${sound.replace(/(?:^|-)([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;

function iconButton(className: string, label: string, icon: typeof PlayIcon): HTMLButtonElement {
  const button = createElement('button', {
    className,
    attrs: { type: 'button', 'aria-label': label, title: label },
  });
  setHtml(button, hugeicon(icon));
  return button;
}

function fileChip(sound: SoundName, file: LocalFile, { slots, urls }: Drawn): HTMLElement {
  const chip = createElement('span', { className: 'ln-ext-pack-sound__file' });
  const play = iconButton('ln-ext-pack-sound__play', message('packsDialogPlay'), PlayIcon);
  play.addEventListener('click', () => void urls.url(file).then(url => new Audio(url).play()));
  const clear = iconButton('ln-ext-pack-slot__clear', message('packsDialogClear'), Cancel01Icon);
  clear.addEventListener('click', () => slots.clear(sound));
  chip.append(
    play,
    createElement('span', {
      className: 'ln-ext-pack-sound__file-name',
      text: file.path.slice(file.path.lastIndexOf('/') + 1),
    }),
    clear,
  );
  return chip;
}

function row(sound: SoundName, drawn: Drawn): HTMLElement {
  const file = drawn.slots.get(sound);
  const element = createElement('div', {
    className: 'ln-ext-pack-slot ln-ext-pack-sound',
    attrs: { role: 'button', tabindex: '0' },
  });
  const text = createElement('span', { className: 'ln-ext-pack-sound__text' });
  text.append(
    createElement('span', {
      className: 'ln-ext-pack-sound__what',
      text: message(describedBy(sound)),
    }),
    createElement('span', { className: 'ln-ext-pack-slot__code', text: sound }),
  );
  element.classList.toggle('ln-ext-pack-slot--filled', file !== undefined);
  element.append(
    text,
    file
      ? fileChip(sound, file, drawn)
      : createElement('span', {
          className: 'ln-ext-pack-sound__pick',
          text: message('packsDialogPick'),
        }),
  );
  slotTarget({ element, slot: sound, accept: ACCEPT }, drawn.slots, drawn.aside);
  return element;
}

// The sounds most sets have, then the others, folded until one of them has a file.
const RARE: ReadonlySet<SoundName> = new Set([
  'move-slide',
  'move-slide-check',
  'move-knight',
  'capture-check',
  'capture-slide',
  'capture-slide-check',
  'capture-promote',
  'checkmate',
]);

function soundList(drawn: Drawn, open: { more: boolean }): HTMLElement {
  const list = createElement('div', { className: 'ln-ext-pack-dialog__sounds' });
  const rare = SOUND_NAMES.filter(sound => RARE.has(sound));
  list.append(...SOUND_NAMES.filter(sound => !RARE.has(sound)).map(sound => row(sound, drawn)));
  const more = createElement('details', { className: 'ln-ext-pack-dialog__more' });
  more.open = open.more || rare.some(sound => drawn.slots.get(sound));
  more.addEventListener('toggle', () => {
    open.more = more.open;
  });
  more.append(
    createElement('summary', { text: message('packsDialogMoreSounds', String(rare.length)) }),
    ...rare.map(sound => row(sound, drawn)),
  );
  list.append(more);
  return list;
}

export function soundBody(files: readonly LocalFile[]): DialogBody {
  const slots = createSlots(assignSounds(files), assignSounds);
  const drawn: Drawn = { slots, urls: fileUrls(), aside: { picked: null } };
  const element = createElement('div', { className: 'ln-ext-pack-dialog__body' });
  // Kept open once opened, as each change draws the list anew.
  const open = { more: false };
  const redraw = (): void => {
    element.replaceChildren(
      ...asideList(slots, drawn.aside, redraw),
      soundList(drawn, open),
      addButton(ACCEPT, slots),
    );
  };
  slots.onChange(redraw);
  redraw();
  return {
    element,
    missing: () => (slots.filled().length === 0 ? message('packsDialogNoSound') : null),
    files: () =>
      SOUND_NAMES.flatMap(sound => {
        const file = slots.get(sound);
        return file ? [renamedFile(file, sound)] : [];
      }),
    add: slots.add,
    onChange: slots.onChange,
    dispose: drawn.urls.revoke,
  };
}
