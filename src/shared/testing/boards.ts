import { z } from 'zod/mini';
import { parsePlacement } from '#shared/chess/fen.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import { createCustomElement, createElement } from '#shared/dom.ts';

// Chessground's main board as the tests build it, and the shapes of the
// recorded fixtures.

export const ColorSchema = z.enum(['white', 'black']);

export interface BoardMarkup {
  readonly placement: string;
  readonly orientation: Color;
  readonly lastMove?: readonly Square[] | undefined;
  readonly selected?: Square | undefined;
  readonly premoves?: readonly Square[] | undefined;
}

// Chessground sets the key on the element itself, not as an attribute.
const keyed = (element: HTMLElement, key: Square): HTMLElement =>
  Object.assign(element, { cgKey: key });

export function addSquare(board: Element, className: string, key: Square): void {
  board.append(keyed(createCustomElement('square', { className }), key));
}

/** Draws the board into the page and returns its `cg-board`. */
export function renderBoard(markup: BoardMarkup): Element {
  const wrap = createElement('div', { className: `cg-wrap orientation-${markup.orientation}` });
  const container = createCustomElement('cg-container');
  const board = createCustomElement('cg-board');
  const main = createElement('main', { className: 'round' });
  const holder = createElement('div', { className: 'main-board' });
  holder.append(wrap);
  wrap.append(container);
  container.append(board);
  main.append(holder, createElement('div', { className: 'outside' }));
  document.body.replaceChildren(main);
  for (const [key, piece] of parsePlacement(markup.placement)) {
    board.append(
      keyed(createCustomElement('piece', { className: `${piece.color} ${piece.role}` }), key),
    );
  }
  // A dragged piece's ghost and a taken piece fading out, which the board reader must skip.
  board.append(keyed(createCustomElement('piece', { className: 'white queen ghost' }), 'h4'));
  board.append(keyed(createCustomElement('piece', { className: 'black rook fading' }), 'h5'));
  if (markup.selected) addSquare(board, 'selected', markup.selected);
  for (const key of markup.premoves ?? []) addSquare(board, 'current-premove', key);
  for (const key of markup.lastMove ?? []) addSquare(board, 'last-move', key);
  return board;
}
