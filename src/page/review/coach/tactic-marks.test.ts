import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { hangingMarks, mateMarks } from './tactic-marks.ts';

const board = (fen: string) => parseFen(fen).board;

describe('hangingMarks', () => {
  // lichess.org/HazZkamE after 16. Qh3: gxf5 wins the knight, whatever holds it.
  const position = board('rnbq1r1k/p4p1p/1p1p1bp1/4pN2/8/1P1B3Q/PBP2PPP/R4RK1 b - - 1 16');

  it('rings the piece and draws the line of the piece that wins it, not its defenders', () => {
    expect(hangingMarks(position, 'f5', 'g6')).toEqual([
      { kind: 'link', from: 'g6', to: 'f5', tone: 'attack' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });

  it('draws no line from a piece that can’t take', () => {
    expect(hangingMarks(position, 'f5', 'h7')).toEqual([
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });

  it('draws nothing on an empty square', () => {
    expect(hangingMarks(board('6k1/8/8/8/8/8/8/3R2K1 w - - 0 1'), 'd5', 'd1')).toEqual([]);
  });
});

describe('mateMarks', () => {
  it('draws the checker’s line and bars the flight squares, behind the king too', () => {
    // A back-rank mate: the rook bars f8, and h8 past the king.
    const mated = board('4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1');
    expect(mateMarks(mated, 'black')).toEqual([
      { kind: 'link', from: 'e8', to: 'g8', tone: 'attack' },
      { kind: 'barred', square: 'h8', tone: 'attack' },
      { kind: 'barred', square: 'f8', tone: 'attack' },
      { kind: 'ring', square: 'g8', tone: 'attack' },
    ]);
  });

  it('draws nothing without the king', () => {
    expect(mateMarks(board('4R3/5ppp/8/8/8/8/8/6K1 b - - 0 1'), 'black')).toEqual([]);
  });
});
