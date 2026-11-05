import { describe, expect, it } from 'vitest';
import { type Board, parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import {
  castledWing,
  minorityAttackOf,
  oppositeWings,
  rookLiftOf,
  stormOf,
} from './attack-plans.ts';

const boardOf = (fen: string): Board => parseFen(fen).board;
const after = (fen: string, uci: string): Board => boardAfter(boardOf(fen), uci);

// White castled long, Black short, queens on.
const OPPOSITE = 'r2q1rk1/pp3ppp/8/8/8/8/PPPQ2PP/2KR3R w - - 0 1';
// Both castled short.
const SAME_WING = 'r2q1rk1/pp3ppp/8/8/8/8/PPPQ2PP/3R1RK1 w - - 0 1';

describe('castledWing', () => {
  it('reads the wing each king castled to', () => {
    expect(castledWing(boardOf(OPPOSITE), 'white')).toEqual([0, 1, 2]);
    expect(castledWing(boardOf(OPPOSITE), 'black')).toEqual([5, 6, 7]);
  });

  it('has none for a king in the center or come up the board', () => {
    expect(castledWing(boardOf('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 'white')).toBeNull();
    expect(castledWing(boardOf('8/8/8/8/8/6K1/8/6k1 w - - 0 1'), 'white')).toBeNull();
  });
});

describe('oppositeWings', () => {
  it('sees the kings on opposite wings in a middlegame', () => {
    expect(oppositeWings(boardOf(OPPOSITE), 'white')).toBe(true);
    expect(oppositeWings(boardOf(SAME_WING), 'white')).toBe(false);
  });

  it('needs a queen of the side’s to attack with', () => {
    // White's queen is gone, Black's is still on.
    const board = boardOf('r2q1rk1/pp3ppp/8/8/8/8/PPP3PP/2KR3R w - - 0 1');
    expect(oppositeWings(board, 'white')).toBe(false);
    expect(oppositeWings(board, 'black')).toBe(true);
  });
});

describe('stormOf', () => {
  it('sees a pawn pushed at the other king, kings on opposite wings', () => {
    expect(stormOf(after(OPPOSITE, 'g2g4'), ['g2', 'g4'], 'white')).toEqual({
      kind: 'storm',
      file: 'g',
    });
  });

  it('needs the pawn on its fourth rank, at the other king’s wing', () => {
    expect(stormOf(after(OPPOSITE, 'g2g3'), ['g2', 'g3'], 'white')).toBeNull();
    expect(stormOf(after(OPPOSITE, 'a2a4'), ['a2', 'a4'], 'white')).toBeNull();
  });

  it('isn’t a storm with both kings on one wing', () => {
    expect(stormOf(after(SAME_WING, 'g2g4'), ['g2', 'g4'], 'white')).toBeNull();
  });
});

describe('rookLiftOf', () => {
  // The e-file is open: the rook can come up to e3, then over to the kingside.
  const open = 'r2q1rk1/pp3ppp/8/8/8/8/PPP2PPP/R2QR1K1 w - - 0 1';

  it('sees a rook lifted to the third rank that can swing over', () => {
    expect(rookLiftOf(after(open, 'e1e3'), ['e1', 'e3'], 'white')).toEqual({ kind: 'rookLift' });
  });

  it('isn’t a lift past the third rank, nor with its way across blocked', () => {
    expect(rookLiftOf(after(open, 'e1e4'), ['e1', 'e4'], 'white')).toBeNull();
    // The knight on f3 stands in the rook's way.
    const blocked = 'r2q1rk1/pp3ppp/8/8/8/5N2/PPP2PPP/R2QR1K1 w - - 0 1';
    expect(rookLiftOf(after(blocked, 'e1e3'), ['e1', 'e3'], 'white')).toBeNull();
  });
});

describe('minorityAttackOf', () => {
  // The Carlsbad: White's a- and b-pawns against Black's a-, b- and c-pawns.
  const carlsbad = 'r2q1rk1/pp3ppp/2p5/3p4/3P4/8/PP3PPP/R2Q1RK1 w - - 0 1';

  it('sees the b-pawn go up against three pawns', () => {
    expect(minorityAttackOf(after(carlsbad, 'b2b4'), ['b2', 'b4'], 'white')).toEqual({
      kind: 'minorityAttack',
    });
  });

  it('needs the b-pawn on its fourth rank, and a c-pawn to hit', () => {
    expect(minorityAttackOf(after(carlsbad, 'b2b3'), ['b2', 'b3'], 'white')).toBeNull();
    // Black's c-pawn stands on e6: two pawns against two.
    const noChain = 'r2q1rk1/pp3ppp/4p3/3p4/3P4/8/PP3PPP/R2Q1RK1 w - - 0 1';
    expect(minorityAttackOf(after(noChain, 'b2b4'), ['b2', 'b4'], 'white')).toBeNull();
    // Three pawns, the a-pawns doubled, but no c-pawn to hit.
    const doubled = 'r2q1rk1/pp3ppp/p7/3p4/3P4/8/PP3PPP/R2Q1RK1 w - - 0 1';
    expect(minorityAttackOf(after(doubled, 'b2b4'), ['b2', 'b4'], 'white')).toBeNull();
  });
});
