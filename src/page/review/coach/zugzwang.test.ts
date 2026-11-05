import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { isZugzwang } from './zugzwang.ts';

const boardOf = (fen: string) => parseFen(fen).board;

describe('isZugzwang', () => {
  // The c6 pawn takes b7 from Black's king: Ka5 leaves it only moves that drop a6.
  it('sees a king move that leaves the other side only losing moves', () => {
    const after = boardOf('8/k7/p1P5/K7/8/8/8/8 b - - 1 1');
    expect(isZugzwang(after, ['b4', 'a5'], 'white')).toBe(true);
  });

  it('isn’t zugzwang when a move holds', () => {
    // From b4 the king doesn't hit a6: Black's king can step about freely.
    const after = boardOf('8/k7/p1P5/8/1K6/8/8/8 b - - 1 1');
    expect(isZugzwang(after, ['c4', 'b4'], 'white')).toBe(false);
  });

  it('can’t tell after a double step, which en passant might answer', () => {
    const after = boardOf('8/k7/p1P5/K7/7P/8/8/8 b - h3 0 1');
    expect(isZugzwang(after, ['h2', 'h4'], 'white')).toBe(false);
  });
});
