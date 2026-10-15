import { afterEach, describe, expect, it } from 'vitest';
import type { Square } from '#shared/chess/types.ts';
import { queryAll } from '#shared/dom.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import { markedSquares, readBoard } from './board-reader.ts';
import { addSquare, renderBoard } from './fixtures/boards.ts';

/** Hides the mark on `square`, as chessground does with one it keeps to reuse. */
function hideMark(board: Element, className: string, square: Square): void {
  for (const mark of queryAll(board, `square.${className}`, HTMLElement))
    if (cgKey(mark) === square) mark.style.display = 'none';
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('the board reader', () => {
  it('reads the squares chessground marks, in their order', () => {
    const board = renderBoard({
      placement: '4k3/8/8/8/4P3/8/8/4K3',
      orientation: 'white',
      lastMove: ['e2', 'e4'],
      premoves: ['e4', 'e5'],
    });
    expect(markedSquares(board, 'last-move')).toEqual(['e2', 'e4']);
    expect(markedSquares(board, 'current-premove')).toEqual(['e4', 'e5']);
    expect(markedSquares(board, 'selected')).toEqual([]);
  });

  it('skips the marks chessground hid, which keep their old square', () => {
    const board = renderBoard({ placement: '4k3/8/8/8/4P3/8/8/4K3', orientation: 'white' });
    // The last move's marks of the move before, hidden ahead of the new ones.
    addSquare(board, 'last-move', 'e7');
    addSquare(board, 'last-move', 'e5');
    hideMark(board, 'last-move', 'e7');
    hideMark(board, 'last-move', 'e5');
    addSquare(board, 'last-move', 'e2');
    addSquare(board, 'last-move', 'e4');
    addSquare(board, 'selected', 'd2');
    hideMark(board, 'selected', 'd2');
    expect(markedSquares(board, 'last-move')).toEqual(['e2', 'e4']);
    expect(markedSquares(board, 'selected')).toEqual([]);
    expect(readBoard(board.closest('.cg-wrap'))?.lastMove).toEqual(['e2', 'e4']);
  });
});
