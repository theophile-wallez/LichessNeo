import { describe, expect, it } from 'vitest';
import { parsePlacement, START_FEN, START_PLACEMENT, writePlacement } from './fen.ts';
import type { Piece, Square } from './types.ts';

describe('writePlacement', () => {
  it.each([
    START_PLACEMENT,
    'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R',
    '8/8/8/8/8/8/8/8',
    'k7/8/8/8/8/8/8/7K',
    'r3k2r/pp1n1ppp/2p5/8/8/2N5/PPP2PPP/R3K2R',
  ])('writes back the placement it was read from: %s', placement => {
    expect(writePlacement(parsePlacement(placement))).toBe(placement);
  });

  it('writes a board built by hand', () => {
    const board = new Map<Square, Piece>([
      ['a1', { color: 'white', role: 'king' }],
      ['h8', { color: 'black', role: 'queen' }],
      ['d4', { color: 'white', role: 'knight' }],
    ]);
    expect(writePlacement(board)).toBe('7q/8/8/8/3N4/8/8/K7');
  });

  it('starts the standard game', () => {
    expect(START_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });
});
