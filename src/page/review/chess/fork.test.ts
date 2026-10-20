import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { forkedFrom, forkedSquares } from './fork.ts';

const board = (fen: string) => parseFen(fen).board;

describe('forkedSquares', () => {
  it('lists the forked pieces’ squares, the most valuable first', () => {
    const fork = board('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1');
    expect(forkedSquares(fork, 'c7')).toEqual(['e8', 'a8']);
    expect(forkedFrom(fork, 'c7')).toEqual([
      { role: 'king', color: 'black' },
      { role: 'rook', color: 'black' },
    ]);
  });

  it('lists none for a single target, or a forker taken for free', () => {
    expect(forkedSquares(board('4k3/2N5/8/8/8/8/8/4K3 b - - 0 1'), 'c7')).toEqual([]);
    expect(forkedSquares(board('r2qk3/2N5/8/8/8/8/8/4K3 b - - 0 1'), 'c7')).toEqual([]);
  });

  it('leaves out a defended piece worth no more than the forker', () => {
    // The bishop on a8 is defended by the knight on b6.
    expect(forkedSquares(board('b3k3/2N5/1n6/8/8/8/8/4K3 b - - 0 1'), 'c7')).toEqual([]);
    expect(forkedSquares(board('b3k3/2N5/8/8/8/8/8/4K3 b - - 0 1'), 'c7')).toEqual(['e8', 'a8']);
  });
});
