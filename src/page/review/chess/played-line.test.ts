import { describe, expect, it } from 'vitest';
import { playLine } from './played-line.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('playLine', () => {
  it('numbers and writes each move, checks marked', () => {
    const plies = playLine(START, ['e2e4', 'f7f6', 'd1h5']);
    expect(plies.map(({ san, color, number }) => [san, color, number])).toEqual([
      ['e4', 'white', 1],
      ['f6', 'black', 1],
      ['Qh5+', 'white', 2],
    ]);
    expect(plies.map(ply => ply.check)).toEqual([false, false, true]);
  });

  it('tells the piece that moves and the one it takes', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const [take] = playLine(fen, ['e4d5']);
    expect(take?.piece).toEqual({ role: 'pawn', color: 'white' });
    expect(take?.captured).toEqual({ role: 'pawn', color: 'black' });
  });

  it('takes en passant a pawn that isn’t on the square moved to', () => {
    const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2';
    const [take] = playLine(fen, ['e5d6']);
    expect(take?.captured).toEqual({ role: 'pawn', color: 'black' });
    expect(take?.after.size).toBe(3);
  });

  it('takes nothing when the king castles onto its own rook', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const [castle] = playLine(fen, ['e1h1']);
    expect(castle?.captured).toBeNull();
  });

  it('reads a promotion', () => {
    const [promotion] = playLine('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', ['e7e8q']);
    expect(promotion?.promotion).toBe('queen');
  });

  it('stops at a move the board doesn’t allow', () => {
    expect(playLine(START, ['e2e4', 'e2e4', 'g1f3'])).toHaveLength(1);
    // A line of another position: White moving on Black's turn.
    expect(playLine(START, ['e2e4', 'd2d4'])).toHaveLength(1);
  });
});
