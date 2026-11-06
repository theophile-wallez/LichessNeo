import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { assignPieces } from '#shared/packs/assign.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import { PIECE_NAMES, type PieceName } from '#shared/packs/pack.ts';
import { createSlots, type Slots } from '#shared/packs/slots.ts';
import { message } from '#content/platform/runtime.ts';
import { addButton, type Aside, asideList, renamedFile, slotTarget } from './dialog-slots.ts';
import { fileUrls, type FileUrls } from './file-urls.ts';
import type { DialogBody } from './import-dialog.ts';

// The pieces' slots in the import dialog: the twelve, white's over black's,
// each showing its image, or what's still to pick.

const ACCEPT = 'image/*';

const ROLES: readonly string[] = [
  'packsRoleKing',
  'packsRoleQueen',
  'packsRoleRook',
  'packsRoleBishop',
  'packsRoleKnight',
  'packsRolePawn',
];

interface Drawn {
  readonly slots: Slots<PieceName, LocalFile>;
  readonly urls: FileUrls;
  readonly aside: Aside<LocalFile>;
}

function clearButton(piece: PieceName, slots: Drawn['slots']): HTMLButtonElement {
  const clear = createElement('button', {
    className: 'ln-ext-pack-slot__clear',
    attrs: { type: 'button', 'aria-label': message('packsDialogClear') },
  });
  setHtml(clear, hugeicon(Cancel01Icon));
  clear.addEventListener('click', () => slots.clear(piece));
  return clear;
}

function slot(piece: PieceName, drawn: Drawn): HTMLElement {
  const { slots, urls, aside } = drawn;
  const file = slots.get(piece);
  const element = createElement('div', {
    className: 'ln-ext-pack-slot',
    attrs: { role: 'button', tabindex: '0', 'aria-label': piece, title: piece },
  });
  const image = createElement('span', { className: 'ln-ext-pack-slot__image' });
  element.append(
    image,
    createElement('span', { className: 'ln-ext-pack-slot__code', text: piece }),
  );
  element.classList.toggle('ln-ext-pack-slot--filled', file !== undefined);
  if (file) {
    element.append(clearButton(piece, slots));
    void urls.url(file).then(url => setStyleProperty(image, 'background-image', `url("${url}")`));
  }
  slotTarget({ element, slot: piece, accept: ACCEPT }, slots, aside);
  return element;
}

function grid(drawn: Drawn): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-pack-dialog__pieces' });
  box.append(
    createElement('span'),
    ...ROLES.map(role =>
      createElement('span', { className: 'ln-ext-pack-dialog__role', text: message(role) }),
    ),
  );
  for (const [side, label] of [
    ['w', 'packsSideWhite'],
    ['b', 'packsSideBlack'],
  ] as const) {
    box.append(
      createElement('span', { className: 'ln-ext-pack-dialog__side', text: message(label) }),
      ...PIECE_NAMES.filter(piece => piece.startsWith(side)).map(piece => slot(piece, drawn)),
    );
  }
  return box;
}

export function pieceBody(files: readonly LocalFile[]): DialogBody {
  const slots = createSlots(assignPieces(files), assignPieces);
  const drawn: Drawn = { slots, urls: fileUrls(), aside: { picked: null } };
  const element = createElement('div', { className: 'ln-ext-pack-dialog__body' });
  const redraw = (): void => {
    element.replaceChildren(
      grid(drawn),
      ...asideList(slots, drawn.aside, redraw),
      addButton(ACCEPT, slots),
    );
  };
  slots.onChange(redraw);
  redraw();
  return {
    element,
    missing: () => {
      const missing = PIECE_NAMES.filter(piece => !slots.get(piece));
      return missing.length === 0 ? null : message('packsDialogMissing', missing.join(', '));
    },
    files: () =>
      PIECE_NAMES.flatMap(piece => {
        const file = slots.get(piece);
        return file ? [renamedFile(file, piece)] : [];
      }),
    add: slots.add,
    onChange: slots.onChange,
    dispose: drawn.urls.revoke,
  };
}
