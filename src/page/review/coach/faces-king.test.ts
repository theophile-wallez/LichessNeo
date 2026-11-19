import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { facesKingMarks, facesKingOf } from './faces-king.ts';

const WHITE_BISHOP = { role: 'bishop', color: 'white' } as const;
const WHITE_QUEEN = { role: 'queen', color: 'white' } as const;
const WHITE_ROOK = { role: 'rook', color: 'white' } as const;
const BLACK_KING = { role: 'king', color: 'black' } as const;

describe('facesKingOf', () => {
  it('sees a bishop, queen or rook line up with the other king through enemy pieces', () => {
    // Bishop on b5 faces the king on e8 through the c6 knight and d7 pawn.
    const bishop = parseFen('r1b1k2r/pppp1ppp/2n5/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').board;
    expect(facesKingOf(boardAfter(bishop, 'f1b5'), ['f1', 'b5'], 'white')).toEqual({
      kind: 'facesKing',
      piece: WHITE_BISHOP,
      king: BLACK_KING,
    });
    // Queen on b3 faces the castled king on g8 through the e6 and f7 pawns.
    const queen = parseFen('3q1rk1/p1pb1ppp/4p3/8/8/8/P4PPP/1Q3RK1 w - - 0 1').board;
    expect(facesKingOf(boardAfter(queen, 'b1b3'), ['b1', 'b3'], 'white')).toEqual({
      kind: 'facesKing',
      piece: WHITE_QUEEN,
      king: BLACK_KING,
    });
    // Rook on g1 faces the king on g8 along the g-file (with White's pawn behind, on g2? No, g4 is not blocking from g5).
    const rook = parseFen('5rk1/5ppp/8/8/8/8/5P1P/4R1K1 w - - 0 1').board;
    expect(facesKingOf(boardAfter(rook, 'e1g1'), ['e1', 'g1'], 'white')).toEqual({
      kind: 'facesKing',
      piece: WHITE_ROOK,
      king: BLACK_KING,
    });
  });

  it('ignores a line shut by one of its own pawns, or a move already on the line', () => {
    // Own e4 pawn blocks the e-file from Qe2 to the king on e8.
    const shut = parseFen('4k3/4p3/8/8/4P3/8/8/3Q2K1 w - - 0 1').board;
    expect(facesKingOf(boardAfter(shut, 'd1e2'), ['d1', 'e2'], 'white')).toBeNull();
    // Moving along the same diagonal the bishop already sat on is no news.
    const already = parseFen('4k3/3p4/2p5/1B6/8/8/8/4K3 w - - 0 1').board;
    expect(facesKingOf(boardAfter(already, 'b5a4'), ['b5', 'a4'], 'white')).toBeNull();
  });

  it('ignores a direct check with nothing between the slider and the king', () => {
    const check = parseFen('4k3/8/8/8/8/8/8/3Q2K1 w - - 0 1').board;
    expect(facesKingOf(boardAfter(check, 'd1e2'), ['d1', 'e2'], 'white')).toBeNull();
  });
});

describe('facesKingMarks', () => {
  it('draws the x-ray line to the king and rings it', () => {
    const after = parseFen('3q1rk1/p1pb1ppp/4p3/8/8/1Q6/P4PPP/5RK1 b - - 0 1').board;
    expect(facesKingMarks(after, 'b3', 'black')).toEqual([
      { kind: 'link', from: 'b3', to: 'g8', tone: 'attack' },
      { kind: 'ring', square: 'g8', tone: 'attack' },
    ]);
  });
});
