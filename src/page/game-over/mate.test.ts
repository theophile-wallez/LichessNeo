import { describe, expect, it } from 'vitest';
import type { FinishedGame } from './game-data.ts';
import { finalMate, mateCells } from './mate.ts';

// A discovered mate: the knight leaves d8 and the rook on a8 mates the king on h8.
const MATE = { ply: 61, fen: 'R6k/6pp/4N3/8/8/8/8/7K b - - 1 1', san: 'Ne6#', uci: 'd8e6' };
const BEFORE = { ply: 60, fen: 'R2N3k/6pp/8/8/8/8/8/7K w - - 0 1', san: 'Kh1', uci: 'g1h1' };

const game = (...treeParts: FinishedGame['treeParts']): FinishedGame => ({
  game: { status: { name: 'mate' }, winner: 'white', variant: { key: 'standard' } },
  treeParts,
});

/** A board as chessground draws it, with each piece's square in its expando. */
function boardWith(pieces: Record<string, string>, orientation = 'white'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `cg-wrap orientation-${orientation}`;
  const board = document.createElement('cg-board');
  for (const [square, classes] of Object.entries(pieces)) {
    const piece = document.createElement('piece');
    piece.className = classes;
    board.append(Object.assign(piece, { cgKey: square }));
  }
  wrap.append(board);
  return wrap;
}

const FINAL = {
  a8: 'white rook',
  h8: 'black king',
  g7: 'black pawn',
  h7: 'black pawn',
  e6: 'white knight',
  h1: 'white king',
};

describe('finalMate', () => {
  it('reads the mate the game ended on', () => {
    expect(finalMate(game(BEFORE, MATE))?.mate).toEqual({ king: 'h8', by: 'a8' });
    expect(finalMate(game(MATE, { ...BEFORE, ply: 62 }))).toBeNull();
    expect(finalMate(game())).toBeNull();
  });
});

describe('mateCells', () => {
  const mate = finalMate(game(BEFORE, MATE));
  if (!mate) throw new Error('no mate');

  it('places the king and its mater as the board is turned', () => {
    expect(mateCells(boardWith(FINAL), mate)).toEqual({
      king: { column: 7, row: 0 },
      by: { column: 0, row: 0 },
    });
    expect(mateCells(boardWith(FINAL, 'black'), mate)).toEqual({
      king: { column: 0, row: 7 },
      by: { column: 7, row: 7 },
    });
  });

  it('shows nothing while the board is on another position', () => {
    const { e6: _knight, ...rest } = FINAL;
    expect(mateCells(boardWith({ ...rest, d8: 'white knight' }), mate)).toBeNull();
    expect(mateCells(boardWith({ ...FINAL, e6: 'white bishop' }), mate)).toBeNull();
  });
});
