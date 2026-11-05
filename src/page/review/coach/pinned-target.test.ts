import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { pinnedTargetOf } from './pinned-target.ts';

// The knight on f6 is pinned to the rook on d8 by the bishop on g5, and held by g7 alone.
const PINNED = '3r3k/5ppp/4pn2/6B1/8/2N5/4QPPP/6K1 w - - 0 1';

function targetAfter(fen: string, [from, to]: [Square, Square]) {
  const before = parseFen(fen).board;
  return pinnedTargetOf(before, boardAfter(before, `${from}${to}`), [from, to]);
}

describe('pinnedTargetOf', () => {
  it('sees a second attacker on the pinned knight', () => {
    expect(targetAfter(PINNED, ['c3', 'e4'])).toEqual({
      kind: 'hitsPinned',
      piece: { role: 'knight', color: 'black' },
      square: 'f6',
    });
  });

  it('doesn’t count an attacker the e6 pawn takes', () => {
    expect(targetAfter(PINNED, ['c3', 'd5'])).toBeNull();
  });

  it('needs the pin: with the rook on c8, the knight can step aside', () => {
    const unpinned = '2r4k/5ppp/4pn2/6B1/8/2N5/4QPPP/6K1 w - - 0 1';
    expect(targetAfter(unpinned, ['c3', 'e4'])).toBeNull();
  });
});
