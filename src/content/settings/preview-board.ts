import { parsePlacement } from '#shared/chess/fen.ts';
import { squareCoords } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';
import { createCustomElement, createElement, setStyleProperty } from '#shared/dom.ts';

// The board of the game animations' preview (intro-preview.ts): chessground's
// markup, drawn by hand, so Lichess's board and piece styles dress it and the
// intros and the end's animations find their pieces as on a game page.

const at = (square: Square): string => {
  const [file, rank] = squareCoords(square);
  return `translate(${file * 100}%, ${(7 - rank) * 100}%)`;
};

/** Puts `element` on `square`, as chessground does. */
export const placeOn = (element: HTMLElement, square: Square): void =>
  setStyleProperty(element, 'transform', at(square));

/** Shows `placement` (a FEN's first field) on `board`, with no square marked. */
export function setPosition(board: HTMLElement, placement: string): Map<Square, HTMLElement> {
  const pieces = new Map<Square, HTMLElement>();
  const elements: HTMLElement[] = [];
  for (const [square, { color, role }] of parsePlacement(placement)) {
    const piece = createCustomElement('piece', { className: `${color} ${role}` });
    placeOn(piece, square);
    pieces.set(square, piece);
    elements.push(piece);
  }
  board.replaceChildren(...elements);
  return pieces;
}

/** Marks `square` as chessground does a last move's or a king in check. */
export function markSquare(board: HTMLElement, square: Square, mark: string): void {
  const element = createCustomElement('square', { className: mark });
  placeOn(element, square);
  board.prepend(element);
}

/** A board in `host`; returns its `cg-board`. */
export function drawBoard(host: HTMLElement, placement: string): HTMLElement {
  const wrap = createElement('div', { className: 'cg-wrap orientation-white' });
  const container = createCustomElement('cg-container');
  const board = createCustomElement('cg-board');
  setPosition(board, placement);
  container.append(board);
  wrap.append(container);
  host.append(wrap);
  return board;
}
