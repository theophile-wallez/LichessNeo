import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { type Play, reasonOf } from './plan.ts';

/** The move `uci` from `fen`, out of the opening. */
function play(fen: string, uci: string, san: string): Play {
  const { board: before, turn: color } = parseFen(fen);
  return { color, ply: 51, uci, san, before, after: boardAfter(before, uci) };
}

const QUEEN = { role: 'queen', color: 'white' } as const;
const ROOK = { role: 'rook', color: 'white' } as const;
const KNIGHT = { role: 'knight', color: 'white' } as const;
const BLACK_PAWN = { role: 'pawn', color: 'black' } as const;

// gknBDHG4, before 18. Qb3 and 19… Re8: the b-file open, the a7-pawn undefended.
const QUEEN_ON_B1 = '3q1rk1/p1pb2pp/3bp3/5p2/3P4/2P1PBB1/P4PPP/1Q3RK1 w - - 2 18';
const BLACK_ON_F8 = '3q1rk1/p1pb2pp/4p3/5p2/3P4/1QP1PBP1/P4PP1/5RK1 b - - 0 19';

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
    expect(reasonOf(play(fen, 'b1a1', 'Ra1'))).toEqual({
      kind: 'openFile',
      halfOpen: false,
      contested: false,
    });
  });

  it('says the battery a tactic leaves ready on its file', () => {
    expect(reasonOf(play(QUEEN_ON_B1, 'b1b7', 'Qb7'))).toEqual({
      kind: 'both',
      first: { kind: 'preparesBattery', partner: ROOK, halfOpen: false },
      second: { kind: 'attacksPawn', piece: BLACK_PAWN, square: 'a7' },
    });
    // The rook could join the queen on b3 too, but that move threatens nothing.
    expect(reasonOf(play(QUEEN_ON_B1, 'b1b3', 'Qb3'))).toBeNull();
  });

  it('says a pawn attacked that nothing defends, unless the attacker hangs', () => {
    expect(reasonOf(play('4k3/p7/8/8/8/8/8/2B1K3 w - - 0 1', 'c1e3', 'Be3'))).toEqual({
      kind: 'attacksPawn',
      piece: BLACK_PAWN,
      square: 'a7',
    });
    expect(reasonOf(play('4k3/p7/8/3n4/8/8/8/2B1K3 w - - 0 1', 'c1e3', 'Be3'))).toBeNull();
  });

  it('says a rook or the queen line up on a file, or a bishop and the queen on a diagonal', () => {
    expect(reasonOf(play('4k3/p7/8/8/8/1Q6/P7/5RK1 w - - 0 1', 'f1b1', 'Rb1'))).toEqual({
      kind: 'fileBattery',
      mover: ROOK,
      partner: QUEEN,
      halfOpen: false,
    });
    // Aimed at the pawn by the king, through c2 to h7.
    expect(reasonOf(play('6k1/6pp/8/8/8/8/3Q4/1B4K1 w - - 0 1', 'd2c2', 'Qc2'))).toEqual({
      kind: 'diagonalBattery',
      mover: QUEEN,
      partner: { role: 'bishop', color: 'white' },
      target: { role: 'pawn', color: 'black' },
    });
  });

  it('says a file contested where a rook or the queen of the other side’s faces the piece', () => {
    expect(reasonOf(play('3rk3/p3p3/8/8/8/8/P3P3/R3K3 w - - 0 1', 'a1d1', 'Rd1'))).toEqual({
      kind: 'openFile',
      halfOpen: false,
      contested: true,
    });
    expect(reasonOf(play(BLACK_ON_F8, 'd8b8', 'Qb8'))).toEqual({
      kind: 'openFile',
      halfOpen: false,
      contested: true,
    });
    // The rook attacks the queen on its way there: that's the point.
    expect(reasonOf(play(BLACK_ON_F8, 'f8b8', 'Rb8'))).toEqual({
      kind: 'chases',
      piece: { role: 'queen', color: 'white' },
    });
  });

  it('has no reason for a capture', () => {
    const fen = '4k3/8/8/3r4/8/8/8/3RK3 w - - 0 1';
    expect(reasonOf(play(fen, 'd1d5', 'Rxd5'))).toBeNull();
  });
});
