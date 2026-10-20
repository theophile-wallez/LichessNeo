import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { mateInOne } from './mate-in-one.ts';

// lichess.org/HazZkamE after 13. Qe4 (instead of Nf5), White to move again:
// the bishop behind the queen holds h7.
const QUEEN_ON_E4 = 'rnbq1rk1/p4ppp/1p1p1b2/4p3/3NQ3/1P1B4/PBP2PPP/R4RK1 w - - 0 13';

describe('mateInOne', () => {
  it('finds the mate the board shows, a battery opening as the queen goes', () => {
    expect(mateInOne(parseFen(QUEEN_ON_E4).board, 'white')).toEqual({ from: 'e4', to: 'h7' });
  });

  it('finds none where the king takes the checker', () => {
    const board = new Map(parseFen(QUEEN_ON_E4).board);
    board.delete('d3');
    expect(mateInOne(board, 'white')).toBeNull();
  });

  it('counts a flight square or a block as a reply', () => {
    // The back rank's mate, Ra8, but for a square for the king or a piece in the way.
    const open = parseFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1').board;
    expect(mateInOne(open, 'white')).toEqual({ from: 'a1', to: 'a8' });
    const luft = parseFen('6k1/5pp1/7p/8/8/8/8/R5K1 w - - 0 1').board;
    expect(mateInOne(luft, 'white')).toBeNull();
    const blocked = parseFen('6k1/5ppp/8/8/8/8/1q6/R5K1 w - - 0 1').board;
    expect(mateInOne(blocked, 'white')).toBeNull();
  });

  it('counts a pawn’s push in the way as a reply', () => {
    // Bb5+ mates unless the c-pawn steps in front.
    const pushed = parseFen('3bkb2/2p1pp2/8/8/8/8/8/5B1K w - - 0 1').board;
    expect(mateInOne(pushed, 'white')).toBeNull();
    const bare = parseFen('3bkb2/4pp2/8/8/8/8/8/5B1K w - - 0 1').board;
    expect(mateInOne(bare, 'white')).toEqual({ from: 'f1', to: 'b5' });
  });

  it('never mates with a move that leaves its own king in check', () => {
    // Rb8 would be mate, but the bishop pins the rook to its king.
    const pinned = parseFen('6k1/5ppp/8/8/8/2b5/1R6/K7 w - - 0 1').board;
    expect(mateInOne(pinned, 'white')).toBeNull();
    const free = parseFen('6k1/5ppp/8/8/8/8/1R6/K7 w - - 0 1').board;
    expect(mateInOne(free, 'white')).toEqual({ from: 'b2', to: 'b8' });
  });
});
