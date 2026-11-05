import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { passedPawns, passedPlan } from './passed-pawns.ts';

// Passed pawns, and what makes one pushed or made worth more.

/** The plan of White's passed pawn moved from `from` to `to`, from `fen`. */
function pushOf(fen: string, [from, to]: [Square, Square], made = false) {
  const before = parseFen(fen).board;
  const after = boardAfter(before, `${from}${to}`);
  return passedPlan({ before, after, color: 'white' }, [from, to], made);
}

describe('passedPawns', () => {
  it('lists the pawns no pawn of the other side’s can stop', () => {
    // a7 and b5 stand in each other's way; g2 runs free.
    const board = parseFen('4k3/p7/8/1P6/8/8/6P1/4K3 w - - 0 1').board;
    expect(passedPawns(board, 'white')).toEqual(['g2']);
    expect(passedPawns(board, 'black')).toEqual([]);
  });
});

describe('passedPlan', () => {
  it('sees a passed pawn pushed to a square a pawn guards', () => {
    expect(pushOf('4k3/8/1p6/8/2PP4/8/8/4K3 w - - 0 1', ['d4', 'd5'])).toEqual({
      kind: 'passedPawn',
      made: false,
      trait: 'protected',
    });
  });

  it('says a pair of passed pawns once, not on every push', () => {
    expect(pushOf('4k3/8/8/8/2PP4/8/8/4K3 w - - 0 1', ['d4', 'd5'])).toEqual({
      kind: 'passedPawn',
      made: false,
      trait: null,
    });
  });

  it('sees a passed pawn made far from the other side’s pawns, in an endgame', () => {
    expect(pushOf('4k3/5ppp/1p6/P7/8/8/5PPP/4K3 w - - 0 1', ['a5', 'b6'], true)).toEqual({
      kind: 'passedPawn',
      made: true,
      trait: 'outside',
    });
  });
});
