import { createElement, setStyleProperty } from '#shared/dom.ts';
import { assign } from '#shared/packs/assign.ts';
import { fileType } from '#shared/packs/loose-names.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import { createSlots } from '#shared/packs/slots.ts';
import { message } from '#content/platform/runtime.ts';
import { renamedFile, slotTarget } from './dialog-slots.ts';
import { fileUrls } from './file-urls.ts';
import type { DialogBody } from './import-dialog.ts';

// The board's slot in the import dialog: its image, large, to see it's the
// whole board the right way up; clicked or dropped on, another one.

const ACCEPT = 'image/*';

// The first image is the board; the others are dropped, as only one shows.
const assignBoard = (files: readonly LocalFile[]) =>
  assign<'board', LocalFile>(
    files.filter(file => fileType(file.path) === 'image').slice(0, 1),
    () => 'board',
  );

export function boardBody(files: readonly LocalFile[]): DialogBody {
  const slots = createSlots(assignBoard(files), assignBoard);
  const urls = fileUrls();
  const element = createElement('div', { className: 'ln-ext-pack-dialog__body' });
  const redraw = (): void => {
    const file = slots.get('board');
    const board = createElement('div', {
      className: 'ln-ext-pack-slot ln-ext-pack-board',
      attrs: { role: 'button', tabindex: '0' },
    });
    const image = createElement('span', { className: 'ln-ext-pack-slot__image' });
    board.append(
      image,
      createElement('span', {
        className: 'ln-ext-pack-board__pick',
        text: message(file ? 'packsDialogChange' : 'packsDialogPick'),
      }),
    );
    board.classList.toggle('ln-ext-pack-slot--filled', file !== undefined);
    if (file)
      void urls.url(file).then(url => setStyleProperty(image, 'background-image', `url("${url}")`));
    slotTarget({ element: board, slot: 'board', accept: ACCEPT }, slots, { picked: null });
    element.replaceChildren(board);
  };
  slots.onChange(redraw);
  redraw();
  return {
    element,
    missing: () => (slots.get('board') ? null : message('packsDialogNoBoard')),
    files: () => {
      const file = slots.get('board');
      return file ? [renamedFile(file, 'board')] : [];
    },
    add: slots.add,
    onChange: slots.onChange,
    dispose: urls.revoke,
  };
}
