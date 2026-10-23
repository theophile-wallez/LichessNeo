import { createElement, queryAll, setStyleProperty } from '#shared/dom.ts';
import type { Color } from '#shared/chess/types.ts';
import { setHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import type { Review } from '#page/review/session.ts';
import { copyBoardBackground, miniBoard, type MiniPosition } from './mini-board.ts';

// Hovering the graph shows the position there as a little board under it, in
// the board's colors and set, turned the way the board is, its last move lit.

const MARGIN = 8;

/** The position after the graph's `index`th move (0 is the start). */
export function positionAt(review: Pick<Review, 'draft'>, index: number): MiniPosition | null {
  if (index === 0) {
    const first = review.draft[0];
    return first ? { fen: first.previousPosition.fen, lastMove: null } : null;
  }
  const move = review.draft[index - 1];
  return move ? { fen: move.position.fen, lastMove: move.uci } : null;
}

let preview: HTMLElement | null = null;
let shown = '';

/** Shows `position` under the graph's box, centered on the pointer's x. */
export function showPreview(
  position: MiniPosition,
  orientation: Color,
  at: { readonly x: number; readonly graph: DOMRect },
): void {
  preview ??= createElement('div', { id: 'ln-ext-graph-board', attrs: { 'aria-hidden': 'true' } });
  const key = `${position.fen}|${position.lastMove ?? ''}|${orientation}`;
  if (key !== shown) {
    shown = key;
    setHtml(preview, miniBoard(position, orientation));
    copyBoardBackground(queryAll(preview, '.ln-ext-mini', HTMLElement));
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
