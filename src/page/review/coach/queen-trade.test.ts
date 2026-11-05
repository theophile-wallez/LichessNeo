import { describe, expect, it } from 'vitest';
import { type Color, parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { queenTradeOf } from './queen-trade.ts';

function tradeAfter(fen: string, [from, to]: [Square, Square], color: Color) {
  const before = parseFen(fen).board;
  return queenTradeOf(before, boardAfter(before, `${from}${to}`), [from, to], color);
}

describe('queenTradeOf', () => {
  it('sees the side two rooks up offer the trade', () => {
    // Qd2 stands where Black's queen takes it, and the rook on d1 takes back.
    const fen = '3q2k1/p4ppp/8/8/8/8/P1Q2PPP/R2R2K1 w - - 0 1';
    expect(tradeAfter(fen, ['c2', 'd2'], 'white')).toEqual({
      kind: 'queenTrade',
      declined: false,
    });
  });

  it('doesn’t call it an offer with the material level', () => {
    const fen = 'r2q2k1/p4ppp/8/8/8/8/P1Q2PPP/3R2K1 w - - 0 1';
    expect(tradeAfter(fen, ['c2', 'd2'], 'white')).toBeNull();
  });

  it('sees the side behind step out of the trade', () => {
    // Black's queen, faced by White's on the d-file, goes to e7, out of its reach.
    const fen = '3q1rk1/p4ppp/8/8/8/8/P2Q1PPP/R2R2K1 b - - 0 1';
    expect(tradeAfter(fen, ['d8', 'e7'], 'black')).toEqual({ kind: 'queenTrade', declined: true });
    // Down the file, to d7, the queens still face each other.
    expect(tradeAfter(fen, ['d8', 'd7'], 'black')).toBeNull();
  });
});
