import { parsePlacement } from './chess/fen.ts';
import { parseSquare, squareCoords } from './chess/squares.ts';
import type { Color, Square } from './chess/types.ts';
import { html, type SafeHtml } from './html.ts';

// A still board of our own, in chessground's markup, so the board and the
// pieces the user picked (Lichess's, ours or a pack's) draw it as they draw
// Lichess's (styles/board/still-board.css). Each piece and square moves by its
// own size (`translate` in %), so the board takes any size. Not a
// `.mini-board`: Lichess would draw over it.

export interface BoardState {
  readonly fen: string;
  readonly orientation: Color;
  readonly lastMove: readonly Square[];
}

/** The two squares of a move in UCI ("e7e8q"), none for anything else. */
export const moveSquares = (uci: string): Square[] =>
  [parseSquare(uci.slice(0, 2)), parseSquare(uci.slice(2, 4))].filter(square => square !== null);

/** A mini board's `data-state` ("<fen>,<orientation>,<uci>"), null if it isn't one. */
export function parseBoardState(state: string): BoardState | null {
  const [fen, orientation, uci = ''] = state.split(',');
  if (!fen || (orientation !== 'white' && orientation !== 'black')) return null;
  return { fen, orientation, lastMove: moveSquares(uci) };
}

// Where a square sits, in squares from the board's top left corner.
function place(square: Square, orientation: Color): string {
  const [file, rank] = squareCoords(square);
  const x = orientation === 'white' ? file : 7 - file;
  const y = orientation === 'white' ? 7 - rank : rank;
  return `transform: translate(${x * 100}%, ${y * 100}%)`;
}

export function boardMarkup({ fen, orientation, lastMove }: BoardState): SafeHtml {
  const [placement = ''] = fen.split(' ');
  const pieces = [...parsePlacement(placement)].map(
    ([square, piece]) =>
      html`<piece class="${piece.color} ${piece.role}" style="${place(square, orientation)}"></piece>`,
  );
  const squares = lastMove.map(
    square => html`<square class="last-move" style="${place(square, orientation)}"></square>`,
  );
  return html`<span class="ln-ext-still-board cg-wrap is2d orientation-${orientation}">
    <cg-container><cg-board>${squares}${pieces}</cg-board></cg-container>
  </span>`;
}
