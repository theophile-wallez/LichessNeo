import { describe, expect, it } from 'vitest';
import { fenTurn, parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { preventedOf } from './prophylaxis.ts';

// A pawn's move that takes a square from a piece of the other side's, where
// it would have pinned or hit one of the mover's.

/** What the push from `from` to `to` keeps the other side from, in `fen`. */
function preventedBy(fen: string, from: Square, to: Square) {
  const before = parseFen(fen).board;
  return preventedOf(before, boardAfter(before, `${from}${to}`), [from, to], fenTurn(fen));
}

// Black's queen on e7, which a knight on d5 would hit.
const QUEEN_OUT = 'rn2kb1r/ppp1qppp/5n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R b KQkq - 5 8';

describe('preventedOf', () => {
  it('sees c6 keep the knight off d5, where it would hit the queen', () => {
    expect(preventedBy(QUEEN_OUT, 'c7', 'c6')).toEqual({
      kind: 'prevents',
      piece: { role: 'knight', color: 'white' },
      square: 'd5',
      target: { role: 'queen', color: 'black' },
      pin: false,
    });
  });

  it('sees h3 keep the bishop off g4, where it would pin the knight', () => {
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    expect(preventedBy(fen, 'h2', 'h3')).toEqual({
      kind: 'prevents',
      piece: { role: 'bishop', color: 'black' },
      square: 'g4',
      target: { role: 'knight', color: 'white' },
      pin: true,
    });
  });

  it('says nothing of a square where the piece would be lost', () => {
    // Nothing guards d5 any more: the f6 knight would take there.
    const fen = 'rn2kb1r/ppp1qppp/5n2/4p3/8/2N5/PPP2PPP/R1B1K2R b KQkq - 5 8';
    expect(preventedBy(fen, 'c7', 'c6')).toBeNull();
  });

  it('says nothing of a piece that comes to guard the square: only a pawn takes it for good', () => {
    const bishop = 'rnb1kb1r/ppp1qppp/5n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R b KQkq - 5 8';
    expect(preventedBy(bishop, 'c8', 'e6')).toBeNull();
  });
});
