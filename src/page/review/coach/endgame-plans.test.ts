import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { cutsOffOf, majorityOf } from './endgame-plans.ts';

// The endings' two plans: a wing's majority pushed, and a rook between the
// other king and a passed pawn.

/** The board after `uci` from `fen`. */
const after = (fen: string, uci: string) => boardAfter(parseFen(fen).board, uci);

describe('majorityOf', () => {
  // Three pawns to two on the queenside, two each on the kingside.
  const ending = '6k1/pp4pp/8/8/8/PPP5/6PP/6K1 w - - 0 1';

  it('sees the majority’s pawn pushed to its fourth rank', () => {
    expect(majorityOf(after(ending, 'c3c4'), ['c3', 'c4'], 'white')).toEqual({
      kind: 'majority',
      queenside: true,
      mine: 3,
      theirs: 2,
    });
  });

  it('says nothing of a push on an even wing, nor with the queens on', () => {
    expect(majorityOf(after(ending, 'h2h4'), ['h2', 'h4'], 'white')).toBeNull();
    const queens = '3qk3/pp4pp/8/8/8/PPP5/6PP/3QK3 w - - 0 1';
    expect(majorityOf(after(queens, 'c3c4'), ['c3', 'c4'], 'white')).toBeNull();
  });
});

describe('cutsOffOf', () => {
  // The a-pawn is passed, the black king on the e-file.
  const ending = '8/8/4k3/8/P7/8/8/K6R w - - 0 1';

  it('sees the rook come between the king and the passed pawn', () => {
    expect(cutsOffOf(after(ending, 'h1d1'), ['h1', 'd1'], 'white')).toEqual({
      kind: 'cutsOff',
      file: 'd',
    });
  });

  it('says nothing of a file on the king’s far side, nor of a rook kept on its file', () => {
    expect(cutsOffOf(after(ending, 'h1f1'), ['h1', 'f1'], 'white')).toBeNull();
    expect(cutsOffOf(after(ending, 'h1h2'), ['h1', 'h2'], 'white')).toBeNull();
  });

  it('says nothing of a rook the king takes', () => {
    const near = '8/8/4k3/7R/P7/8/8/K7 w - - 0 1';
    expect(cutsOffOf(after(near, 'h5d5'), ['h5', 'd5'], 'white')).toBeNull();
  });
});
