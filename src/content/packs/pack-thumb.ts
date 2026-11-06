import { createElement, setStyleProperty } from '#shared/dom.ts';
import type { Pack } from '#shared/packs/pack.ts';

/** The packs' board, their white knight over it; a note on a tile for sounds alone. */
export function packThumb(packs: readonly Pack[]): HTMLElement {
  const thumb = createElement('span', { className: 'ln-ext-pack__thumb' });
  const board = packs.find(pack => pack.board)?.board;
  const pieces = packs.find(pack => pack.pieces)?.pieces;
  if (board) setStyleProperty(thumb, 'background-image', `url("${board.image}")`);
  if (pieces) {
    const knight = createElement('span', { className: 'ln-ext-pack__piece' });
    setStyleProperty(knight, 'background-image', `url("${pieces.wN}")`);
    thumb.append(knight);
  }
  thumb.classList.toggle('ln-ext-pack__thumb--sound', !board && !pieces);
  return thumb;
}
