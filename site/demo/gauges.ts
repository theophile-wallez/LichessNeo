import { queryAll, queryOne } from '#shared/dom.ts';
import { barLabel } from '#page/review/evaluation/format.ts';
import type { DemoParts } from './demo.ts';
import { pieceUrl } from './pieces.ts';
import { positions, records } from './review.ts';

// What follows the move on the board around the demo's card: the eval bar, the
// graph's cursor and the move picked in the list; and the piece set the
// comments' pieces are drawn in.

/** White's share of the eval bar at `ply`, and its label. */
export function drawEval(evalBar: HTMLElement, ply: number): void {
  const record = records[ply];
  if (!record) return;
  evalBar.style.setProperty('--white', `${record.whiteWinChance}%`);
  const label = evalBar.querySelector('span');
  if (label) label.textContent = barLabel(record);
  evalBar.dataset.side = record.whiteWinChance >= 50 ? 'white' : 'black';
}

/** The graph's cursor at `ply`, and its move picked and in view in each of the panel's lists. */
export function drawCursor(parts: Pick<DemoParts, 'graphCursor' | 'panel'>, ply: number): void {
  parts.graphCursor.style.left = `${(ply / (positions.length - 1)) * 100}%`;
  for (const list of queryAll(parts.panel, '.demo-moves', HTMLElement)) {
    for (const button of queryAll(list, '[data-ply]', HTMLElement))
      button.toggleAttribute('aria-current', button.dataset.ply === String(ply));
    const current = queryOne(list, '[aria-current]', HTMLElement);
    if (current)
      list.scrollTo({ top: current.offsetTop - list.clientHeight / 2, behavior: 'smooth' });
  }
}

const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

/**
 * The comments' pieces (`.ln-ext-pc-*`, demo-panel.css) and the layout's board
 * (looks.css) in the set picked, as absolute URLs on <html>.
 */
export function setPieceGlyphs(root: HTMLElement, pieceSet: string): void {
  for (const code of PIECE_CODES) {
    const url = new URL(pieceUrl(pieceSet, code), document.baseURI).href;
    root.style.setProperty(`--pc-${code}`, `url("${url}")`);
  }
}
