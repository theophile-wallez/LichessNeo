import { createElement } from '#shared/dom.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import type { Slots } from '#shared/packs/slots.ts';
import { message } from '#content/platform/runtime.ts';
import { droppedFiles, pickedFiles } from './local-files.ts';

// What the import dialog's slots share: a file picked or dropped on one, a
// file left aside dragged to one or, on a touch screen, tapped then put in
// one, and the files named as the import wants them.

const LOOSE_TYPE = 'text/x-ln-ext-loose';
const OVER = 'ln-ext-pack-slot--over';

/** Opens the browser's file picker; gives what the user picked, if anything. */
export function pickFiles(accept: string, multiple: boolean): Promise<LocalFile[]> {
  const input = createElement('input', { attrs: { type: 'file', accept } });
  input.multiple = multiple;
  return new Promise(resolve => {
    input.addEventListener(
      'change',
      () => void pickedFiles([...(input.files ?? [])]).then(resolve),
    );
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

/** The file under the name the import reads it by, its extension kept. */
export function renamedFile(file: LocalFile, base: string): LocalFile {
  const dot = file.path.lastIndexOf('.');
  const extension = dot > file.path.lastIndexOf('/') ? file.path.slice(dot) : '';
  return { ...file, path: `${base}${extension}` };
}

/** The files aside, one of them picked to go in the next slot tapped. */
export interface Aside<File> {
  picked: File | null;
}

export interface Target<Slot extends string> {
  readonly element: HTMLElement;
  readonly slot: Slot;
  readonly accept: string;
}

/** Makes the element its slot's: a click picks a file for it, a drop puts one in. */
export function slotTarget<Slot extends string>(
  { element, slot, accept }: Target<Slot>,
  slots: Slots<Slot, LocalFile>,
  aside: Aside<LocalFile>,
): void {
  element.addEventListener('click', event => {
    // Its own buttons (clear, play) do their own thing.
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (aside.picked) {
      slots.put(slot, aside.picked);
      aside.picked = null;
      return;
    }
    void pickFiles(accept, false).then(([file]) => {
      if (file) slots.put(slot, file);
      return undefined;
    });
  });
  element.addEventListener('dragover', event => {
    event.preventDefault();
    element.classList.toggle(OVER, true);
  });
  element.addEventListener('dragleave', () => element.classList.toggle(OVER, false));
  element.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.toggle(OVER, false);
    const transfer = event.dataTransfer;
    const index = transfer?.getData(LOOSE_TYPE) ?? '';
    const loose = index === '' ? undefined : slots.loose()[Number(index)];
    if (loose) slots.put(slot, loose);
    else if (transfer) void dropInto(slot, droppedFiles(transfer), slots);
  });
}

// One file goes in the slot dropped on; several, each in the slot its name says.
async function dropInto<Slot extends string>(
  slot: Slot,
  dropped: Promise<LocalFile[]>,
  slots: Slots<Slot, LocalFile>,
): Promise<void> {
  const files = await dropped;
  const [file] = files;
  if (files.length > 1) slots.add(files);
  else if (file) slots.put(slot, file);
}

/** The files aside, each dragged to a slot, or tapped then put in the slot tapped next. */
export function asideList<Slot extends string>(
  slots: Slots<Slot, LocalFile>,
  aside: Aside<LocalFile>,
  redraw: () => void,
): HTMLElement[] {
  const loose = slots.loose();
  if (loose.length === 0) return [];
  const box = createElement('div', { className: 'ln-ext-pack-dialog__aside' });
  const chips = loose.map((file, i) => {
    const chip = createElement('button', {
      className: 'ln-ext-pack-dialog__loose',
      text: file.path.slice(file.path.lastIndexOf('/') + 1),
      attrs: { type: 'button', draggable: 'true' },
    });
    chip.classList.toggle('ln-ext-pack-dialog__loose--picked', aside.picked === file);
    chip.addEventListener('dragstart', event => event.dataTransfer?.setData(LOOSE_TYPE, String(i)));
    chip.addEventListener('click', () => {
      aside.picked = aside.picked === file ? null : file;
      redraw();
    });
    return chip;
  });
  box.append(
    createElement('span', {
      className: 'ln-ext-pack-dialog__aside-label',
      text: message('packsDialogLoose'),
    }),
    ...chips,
  );
  return [box];
}

/** The button that adds files at once, each to the slot its name says. */
export function addButton<Slot extends string>(
  accept: string,
  slots: Slots<Slot, LocalFile>,
): HTMLElement {
  const add = createElement('button', {
    className: 'ln-ext-pack-dialog__add',
    text: message('packsDialogAdd'),
    attrs: { type: 'button' },
  });
  add.addEventListener('click', () => void pickFiles(accept, true).then(slots.add));
  return add;
}
