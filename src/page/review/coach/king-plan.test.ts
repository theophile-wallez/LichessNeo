import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { kingPlan } from './king-plan.ts';

// What a king's step does in an ending: it goes after a pawn, walks beside its
// own passed pawn, comes in front of the other side's, or takes the center.

/** The plan of White's king step from `from` to `to`, from `fen`. */
function stepOf(fen: string, from: Square, to: Square) {
  const before = parseFen(fen).board;
  return kingPlan({ before, after: boardAfter(before, `${from}${to}`), color: 'white', from, to });
}

describe('kingPlan', () => {
  it('sees the king go after a pawn nothing defends', () => {
    expect(stepOf('7k/8/8/8/2p5/4K3/8/8 w - - 0 1', 'e3', 'd4')).toEqual({
      kind: 'attacksPawn',
      piece: { role: 'pawn', color: 'black' },
      square: 'c4',
    });
  });

  it('sees the king come in front of the other side’s passed pawn', () => {
    expect(stepOf('7k/8/8/8/2p5/4K3/8/8 w - - 0 1', 'e3', 'd2')).toEqual({
      kind: 'stopsPasser',
      pawn: { role: 'pawn', color: 'black' },
      square: 'c4',
    });
  });

  it('sees the king walk beside its own passed pawn, not in front of it', () => {
    // Black's pawn keeps it from king and pawn against king, where the key squares say it.
    const fen = 'k2K4/p7/8/3P4/8/8/8/8 w - - 0 1';
    expect(stepOf(fen, 'd8', 'c7')).toEqual({
      kind: 'escorts',
      pawn: { role: 'pawn', color: 'white' },
      square: 'd5',
    });
    expect(stepOf(fen, 'd8', 'd7')).toBeNull();
  });

  it('sees the king take the center, in an endgame only', () => {
    expect(stepOf('4k3/8/8/8/8/8/5K2/R7 w - - 0 1', 'f2', 'e3')).toEqual({ kind: 'centralKing' });
    expect(stepOf('3qk3/8/8/8/8/8/5K2/3Q4 w - - 0 1', 'f2', 'e3')).toBeNull();
  });
});
