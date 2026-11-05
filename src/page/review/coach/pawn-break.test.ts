import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { pawnBreakOf } from './pawn-break.ts';

// A pawn pushed at the other side's chain: at its base, or a pawn in it, with
// the other king still home in the center.

/** The break Black's push from `from` to `to` makes, from `fen`. */
function breakOf(fen: string, from: Square, to: Square) {
  const after = boardAfter(parseFen(fen).board, `${from}${to}`);
  return pawnBreakOf(after, to, 'black');
}

// A French: White's chain d4-e5 against Black's d5-e6.
const FRENCH = '6k1/ppp2ppp/4p3/3pP3/3P4/8/PP3PPP/4K3 b - - 0 1';

describe('pawnBreakOf', () => {
  it('sees c5 hit the chain at its base, the white king still home', () => {
    expect(breakOf(FRENCH, 'c7', 'c5')).toEqual({
      kind: 'pawnBreak',
      square: 'd4',
      base: true,
      king: 'e1',
    });
  });

  it('sees f6 hit the chain’s head, the white king castled', () => {
    const castled = '6k1/ppp2ppp/4p3/3pP3/3P4/8/PP3PPP/6K1 b - - 0 1';
    expect(breakOf(castled, 'f7', 'f6')).toEqual({
      kind: 'pawnBreak',
      square: 'e5',
      base: false,
      king: null,
    });
  });

  it('says nothing of a push at a pawn standing alone', () => {
    expect(breakOf('6k1/ppp2ppp/8/8/3P4/8/PP3PPP/4K3 b - - 0 1', 'c7', 'c5')).toBeNull();
  });
});
