import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { nextFakeFrame } from '#shared/testing/timers.ts';
import { renderBoard } from '#shared/testing/boards.ts';
import { pieceSquares } from './index.ts';

const root = document.documentElement;

// The square each piece of the board is marked with, by its key.
function marks(board: Element): Record<string, string | undefined> {
  const shown: Record<string, string | undefined> = {};
  for (const piece of board.querySelectorAll('piece:not(.ghost, .fading)'))
    if (piece instanceof HTMLElement && 'cgKey' in piece && typeof piece.cgKey === 'string')
      shown[piece.cgKey] = piece.dataset.lnExtSquare;
  return shown;
}

// Once, as the page script starts it: it then follows <html>'s attribute.
beforeAll(() => pieceSquares.start());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
});

afterEach(() => {
  delete root.dataset.lnExtPieces;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the pieces’ squares', () => {
  it('mark each piece’s square while a ringed set is shown, and only then', async () => {
    const board = renderBoard({ placement: 'k7/8/8/8/8/8/8/R6K', orientation: 'white' });
    root.dataset.lnExtPieces = 'mochi';
    await nextFakeFrame();
    expect(marks(board)).toEqual({ a8: undefined, a1: undefined, h1: undefined });
    root.dataset.lnExtPieces = 'pebble';
    await nextFakeFrame();
    expect(marks(board)).toEqual({ a8: 'light', a1: 'dark', h1: 'light' });
    root.dataset.lnExtPieces = 'mochi';
    await nextFakeFrame();
    expect(board.querySelector('[data-ln-ext-square]')).toBeNull();
  });

  it('follow a piece chessground moves, and a board it draws', async () => {
    root.dataset.lnExtPieces = 'loop';
    const board = renderBoard({ placement: '8/8/8/8/8/8/8/R7', orientation: 'black' });
    await nextFakeFrame();
    expect(marks(board)).toEqual({ a1: 'dark' });
    // Chessground keeps the element, and gives it its new square and place.
    const rook = queryOne(board, 'piece.rook', HTMLElement);
    if (!rook) throw new Error('no rook');
    Object.assign(rook, { cgKey: 'a2' });
    rook.style.transform = 'translate(0px, 60px)';
    await nextFakeFrame();
    expect(marks(board)).toEqual({ a2: 'light' });
  });
});
