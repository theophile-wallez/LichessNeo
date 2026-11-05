import { describe, expect, it } from 'vitest';
import { fenTurn, parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { pawnShape } from './pawn-shape.ts';

// What a pawn's push does once it attacks nothing: a hole for the king, a
// break against a chain, space on the fifth rank.

/** What the push from `from` to `to`, at `ply`, does for the side to move in `fen`. */
function shapeOf(fen: string, [from, to]: [Square, Square], ply = 40) {
  const before = parseFen(fen).board;
  const uci = `${from}${to}`;
  const after = boardAfter(before, uci);
  return pawnShape({ color: fenTurn(fen), ply, uci, san: to, before, after }, from, to);
}

describe('pawnShape', () => {
  // The white king boxed in by its pawns, a black rook on the d-file.
  const backRank = '3r2k1/5ppp/8/8/8/8/R4PPP/6K1 w - - 0 1';

  it('sees a hole made for a king a rook could mate on its back rank', () => {
    expect(shapeOf(backRank, ['h2', 'h3'])).toEqual({ kind: 'luft' });
  });

  it('says nothing of that push in the opening, where the back rank isn’t the point', () => {
    expect(shapeOf(backRank, ['h2', 'h3'], 10)).toBeNull();
  });

  it('sees a break at the base of a chain', () => {
    const french = '3q2k1/ppp2ppp/4p3/3pP3/3P4/8/PP3PPP/3QK3 b - - 0 1';
    expect(shapeOf(french, ['c7', 'c5'])).toEqual({
      kind: 'pawnBreak',
      square: 'd4',
      base: true,
      king: 'e1',
    });
  });

  it('sees space gained on the fifth rank', () => {
    expect(shapeOf('3qk3/8/8/8/4P3/8/8/3QK3 w - - 0 1', ['e4', 'e5'])).toEqual({ kind: 'space' });
  });
});
