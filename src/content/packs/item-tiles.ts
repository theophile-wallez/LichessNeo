import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { isFileItem, kindOf, newestFirst } from '#shared/packs/items.ts';
import { PART_KINDS, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import type { Library } from './library.ts';
import { editItem, localZone } from './local-zones.ts';
import { soundPlayer } from './sound-player.ts';

// The Packs card's rows of the user's own items (styles/pages/settings-packs-items.css),
// a row for each kind in its hue: each item a tile that picks it, with its
// buttons to edit or remove it (a sound set's player too, sound-player.ts), after the zone that adds one, the newest first.

const TITLES: Readonly<Record<PartKind, string>> = {
  board: 'packsComposeBoards',
  piece: 'packsComposePieces',
  sound: 'packsComposeSounds',
};

function iconButton(
  className: string,
  label: string,
  icon: typeof Delete02Icon,
): HTMLButtonElement {
  const button = createElement('button', {
    className: `ln-ext-item__action ${className}`,
    attrs: { type: 'button', 'aria-label': label, title: label },
  });
  setHtml(button, hugeicon(icon));
  return button;
}

/** The board itself, the queen and the knight of each side, or room for the sounds' player. */
function preview(item: Pack): HTMLElement {
  const box = createElement('span', { className: 'ln-ext-item__preview' });
  if (item.board) setStyleProperty(box, 'background-image', `url("${item.board.image}")`);
  if (item.pieces)
    for (const url of [item.pieces.wQ, item.pieces.bN]) {
      const piece = createElement('span', { className: 'ln-ext-item__piece' });
      setStyleProperty(piece, 'background-image', `url("${url}")`);
      box.append(piece);
    }
  return box;
}

function actions(item: Pack, library: Library): HTMLElement {
  const box = createElement('span', { className: 'ln-ext-item__actions' });
  const edit = iconButton('ln-ext-item__edit', message('packsEdit'), PencilEdit02Icon);
  edit.addEventListener('click', () => void editItem(item, library));
  const remove = iconButton('ln-ext-item__remove', message('packsRemove'), Delete02Icon);
  remove.addEventListener('click', () => void library.remove(item.id));
  box.append(edit, remove);
  return box;
}

function tile(item: Pack, kind: PartKind, library: Library): HTMLElement {
  const on = library.current(kind) === item.id;
  const box = createElement('div', { className: 'ln-ext-item' });
  box.classList.toggle('ln-ext-item--on', on);
  const pick = createElement('button', {
    className: 'ln-ext-item__pick',
    attrs: { type: 'button', 'aria-pressed': String(on), title: item.name },
  });
  const check = createElement('span', { className: 'ln-ext-item__check' });
  setHtml(check, hugeicon(Tick02Icon));
  pick.append(
    preview(item),
    check,
    createElement('span', { className: 'ln-ext-item__name', text: item.name }),
  );
  pick.addEventListener('click', () => library.choose(kind, item.id));
  // A button can't hold another: the player stands over the pick's preview,
  // under the tile's own buttons.
  box.append(pick, ...(kind === 'sound' ? [soundPlayer(item)] : []), actions(item, library));
  return box;
}

function kindRow(kind: PartKind, items: readonly Pack[], library: Library): HTMLElement {
  const row = createElement('section', {
    className: `ln-ext-packs__kind ln-ext-packs__kind--${kind}`,
  });
  const title = createElement('h3', { className: 'ln-ext-packs__kind-title' });
  title.append(
    createElement('span', {
      className: 'ln-ext-packs__drop-icon',
      attrs: { 'aria-hidden': 'true' },
    }),
    message(TITLES[kind]),
  );
  const tiles = createElement('div', { className: 'ln-ext-packs__tiles' });
  tiles.append(localZone(kind, library), ...items.map(item => tile(item, kind, library)));
  row.append(title, tiles);
  return row;
}

/** A row for each kind: the user's boards, piece sets and sound sets, and a zone to add more. */
export function itemRows(library: Library): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-packs__kinds' });
  const items = newestFirst(library.packs().filter(isFileItem));
  box.append(
    ...PART_KINDS.map(kind =>
      kindRow(
        kind,
        items.filter(item => kindOf(item) === kind),
        library,
      ),
    ),
  );
  return box;
}
