import { describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { boardMarkup, parseBoardState } from './board.ts';

const FEN = '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1';

// Each piece's or square's class and place, in the order drawn.
function drawn(state: string): string[] {
  const board = parseBoardState(state);
  if (!board) throw new Error('no board');
  setHtml(document.body, boardMarkup(board));
  return [...document.querySelectorAll('cg-board > *')].map(
    element => `${element.className} ${element.getAttribute('style')}`,
  );
}

describe('a history board', () => {
  it('reads a mini board’s state, its last move a square each', () => {
    expect(parseBoardState(`${FEN},black,e7e8q`)).toEqual({
      fen: FEN,
      orientation: 'black',
      lastMove: ['e7', 'e8'],
    });
    expect(parseBoardState(`${FEN},white`)?.lastMove).toEqual([]);
  });

  it('reads nothing from a state that isn’t one', () => {
    expect(parseBoardState('')).toBeNull();
    expect(parseBoardState(`${FEN},red,e2e4`)).toBeNull();
  });

  it('draws the last move, then each piece, a square’s size from the top left', () => {
    expect(drawn(`${FEN},white,e1e2`)).toEqual([
      'last-move transform: translate(400%, 700%)',
      'last-move transform: translate(400%, 600%)',
      'black king transform: translate(600%, 0%)',
      'white pawn transform: translate(400%, 600%)',
      'white king transform: translate(400%, 700%)',
    ]);
    expect(document.querySelector('.lr-ext-phist__board')?.className).toBe(
      'lr-ext-phist__board cg-wrap is2d orientation-white',
    );
  });

  it('turns the board for black', () => {
    expect(drawn(`${FEN},black`)).toEqual([
      'black king transform: translate(100%, 700%)',
      'white pawn transform: translate(300%, 100%)',
      'white king transform: translate(300%, 0%)',
    ]);
  });
});
