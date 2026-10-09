import { wrapOrientation } from '#shared/chessground.ts';
import { opposite, type Color } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { readPlayer } from '#shared/player-bar.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import { cellOf, type BoardCell } from './badges.ts';

// What the game over reads off the game page: where the kings stand, and the
// opponent's name as their bar shows it.

// The game page's board, or the analysis board's, where a dev build previews it (preview.ts).
const boardWrap = (main: HTMLElement): HTMLElement | null =>
  queryOne(main, ':is(.round__app__board, .analyse__board) .cg-wrap', HTMLElement);

/** Each king's cell, as the board is turned now. */
export function kingCells(main: HTMLElement): Partial<Record<Color, BoardCell>> {
  const wrap = boardWrap(main);
  const cells: Partial<Record<Color, BoardCell>> = {};
  if (!wrap) return cells;
  const bottom = wrapOrientation(wrap);
  for (const piece of wrap.querySelectorAll('cg-board piece.king:not(.ghost, .fading)')) {
    const square = cgKey(piece);
    const color = piece.classList.contains('white') ? 'white' : 'black';
    if (square) cells[color] = cellOf(square, bottom);
  }
  return cells;
}

/** The name on the bar of `player`'s opponent, or `fallback` without one. */
export function opponentName(main: HTMLElement, player: Color, fallback: string): string {
  const wrap = boardWrap(main);
  const bottom = wrap ? wrapOrientation(wrap) : player;
  const bar = queryOne(
    main,
    bottom === opposite(player)
      ? ':is(.ruser-bottom, .lr-ext-player--bottom)'
      : ':is(.ruser-top, .lr-ext-player--top)',
    HTMLElement,
  );
  const name = bar ? readPlayer(bar, undefined).name : '';
  return name === '' ? fallback : name;
}
