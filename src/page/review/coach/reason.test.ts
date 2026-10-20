import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { type Play, reasonOf } from './plan.ts';

/** White's move `uci` from `fen`, out of the opening. */
function play(fen: string, uci: string, san: string): Play {
  const before = parseFen(fen).board;
  return { color: 'white', ply: 51, uci, san, before, after: boardAfter(before, uci) };
}

const QUEEN = { role: 'queen', color: 'white' } as const;
const KNIGHT = { role: 'knight', color: 'white' } as const;

describe('reasonOf', () => {
  it('says a tactic set up on the way to defending a piece as both', () => {
    // Qb2 lines up behind the knight on d4, on the king, and defends that knight.
    const fen = 'r3qr2/1p3bkp/2n3p1/3p2P1/3N3P/1P1B4/N2Q1P2/1K1R3R w - - 1 26';
    expect(reasonOf(play(fen, 'd2b2', 'Qb2'))).toEqual({
      kind: 'both',
      first: { kind: 'guards', piece: KNIGHT },
      second: {
        kind: 'discovery',
        slider: QUEEN,
        screen: KNIGHT,
        target: { role: 'king', color: 'black' },
      },
    });
  });

  it('says a tactic that defends nothing on its own', () => {
    const fen = '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1';
    expect(reasonOf(play(fen, 'f1b5', 'Bb5'))).toEqual({
      kind: 'pins',
      piece: { role: 'knight', color: 'black' },
      behind: { role: 'king', color: 'black' },
    });
  });

  it('keeps a plan that isn’t a tactic alone, whatever it defends', () => {
    // The rook takes the open file, and defends the knight the other rook attacks.
    const fen = 'r3k3/8/8/8/N7/8/8/1R2K3 w - - 0 1';
    expect(reasonOf(play(fen, 'b1a1', 'Ra1'))).toEqual({ kind: 'openFile', halfOpen: false });
  });

  it('has no reason for a capture', () => {
    const fen = '4k3/8/8/3r4/8/8/8/3RK3 w - - 0 1';
    expect(reasonOf(play(fen, 'd1d5', 'Rxd5'))).toBeNull();
  });
});
