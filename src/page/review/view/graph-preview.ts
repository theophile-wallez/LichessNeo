import { createElement, setStyleProperty } from '#shared/dom.ts';
import { parsePlacement } from '#shared/chess/fen.ts';
import { colorLetter, ROLE_LETTERS } from '#shared/chess/pieces.ts';
import { parseSquare, squareCoords } from '#shared/chess/squares.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import type { Review } from '#page/review/session.ts';

// Hovering the graph shows the position there as a little board under it, in
// the board's colors and set, turned the way the board is, its last move lit.

const MARGIN = 8;

export interface PreviewPosition {
  readonly fen: string;
  /** The move that led there, in UCI, or null at the start. */
  readonly lastMove: string | null;
}

/** The position after the graph's `index`th move (0 is the start). */
export function positionAt(review: Pick<Review, 'draft'>, index: number): PreviewPosition | null {
  if (index === 0) {
    const first = review.draft[0];
    return first ? { fen: first.previousPosition.fen, lastMove: null } : null;
  }
  const move = review.draft[index - 1];
  return move ? { fen: move.position.fen, lastMove: move.uci } : null;
}

/** A square's column and row on screen, from the top left, the board turned to `orientation`. */
function cell(square: Square, orientation: Color): string {
  const [file, rank] = squareCoords(square);
  const white = orientation === 'white';
  return `--x:${white ? file : 7 - file};--y:${white ? 7 - rank : rank}`;
}

export function boardMarkup({ fen, lastMove }: PreviewPosition, orientation: Color): SafeHtml {
  const board = parsePlacement(fen.split(' ')[0] ?? '');
  const lit = [lastMove?.slice(0, 2), lastMove?.slice(2, 4)].flatMap(text => {
    const square = text === undefined ? null : parseSquare(text);
    return square
      ? [html`<span class="cdc-mini__lit" style="${cell(square, orientation)}"></span>`]
      : [];
  });
  const pieces = [...board].map(([square, { color, role }]) => {
    const code = `${colorLetter(color)}${ROLE_LETTERS[role]}`;
    return html`<i class="cdc-pc cdc-pc-${code}" style="${cell(square, orientation)}"></i>`;
  });
  return html`<div class="cdc-mini">${lit}${pieces}</div>`;
}

let preview: HTMLElement | null = null;
let shown = '';

/** Shows `position` under the graph's box, centered on the pointer's x. */
export function showPreview(
  position: PreviewPosition,
  orientation: Color,
  at: { readonly x: number; readonly graph: DOMRect },
): void {
  preview ??= createElement('div', { id: 'cdc-graph-board', attrs: { 'aria-hidden': 'true' } });
  const key = `${position.fen}|${position.lastMove ?? ''}|${orientation}`;
  if (key !== shown) {
    shown = key;
    setHtml(preview, boardMarkup(position, orientation));
  }
  if (!preview.isConnected) document.body.append(preview);
  const width = preview.offsetWidth;
  const left = clamp(at.x - width / 2, MARGIN, window.innerWidth - width - MARGIN);
  setStyleProperty(preview, 'left', `${left}px`);
  setStyleProperty(preview, 'top', `${at.graph.bottom + MARGIN}px`);
}

export function hidePreview(): void {
  preview?.remove();
}
