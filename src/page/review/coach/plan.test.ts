import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { en } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import { planFact } from './plan.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KNIGHT = { role: 'knight', color: 'white' } as const;

interface Move {
  readonly fen: string;
  readonly uci: string;
  readonly san: string;
  readonly ply?: number;
  /** The review's index of the move, when it isn't its ply (a game from a position). */
  readonly index?: number;
  readonly mate?: boolean;
}

/** What the coach says of the move's plan, as the engine's best; one of the ways to say it. */
function planOf({ fen, uci, san, ply = 20, index = ply, mate = false }: Move): string | null {
  const score = mate ? { mate: 4 } : { cp: 0 };
  const record = { ...score, whiteWinChance: 50, secondLineWinChance: null, best: uci };
  const judged = judge({
    previousPosition: { ply: ply - 1, fen },
    position: { ply, fen, uci, san },
    before: record,
    after: { ...record, best: null },
    book: false,
    chess960: false,
  });
  const move = { ...judged, ply: index };
  const before = parseFen(fen).board;
  const after = boardAfter(before, uci);
  return planFact({ move, sentences: en.facts, before, after })?.text ?? null;
}

describe('planFact', () => {
  it('sees a minor piece developed in the opening, not later', () => {
    expect(en.facts.develops(KNIGHT)).toContain(
      planOf({ fen: START, uci: 'g1f3', san: 'Nf3', ply: 1 }),
    );
    expect(planOf({ fen: START, uci: 'g1f3', san: 'Nf3', ply: 41 })).toBeNull();
  });

  it('reads the move’s ply on the board, which a game from a position starts past 0', () => {
    // The game's first move, at move 21.
    expect(planOf({ fen: START, uci: 'g1f3', san: 'Nf3', ply: 41, index: 1 })).toBeNull();
    expect(planOf({ fen: START, uci: 'e2e4', san: 'e4', ply: 41, index: 1 })).toBeNull();
  });

  it('sees a knight settle where no pawn can chase it', () => {
    // Short of an outpost (no pawn holds it, or one can chase it), the knight just takes the center.
    const central = en.facts.centralizes(KNIGHT);
    const fen = '4k3/p6p/8/8/3P4/2N5/8/4K3 w - - 0 1';
    expect(central).toContain(planOf({ fen, uci: 'c3e4', san: 'Ne4' }));
    const chased = '4k3/p4p2/8/8/3P4/5N2/8/4K3 w - - 0 1';
    expect(central).toContain(planOf({ fen: chased, uci: 'f3e5', san: 'Ne5' }));
    const held = '4k3/p6p/8/3P4/8/5N2/8/4K3 w - - 0 1';
    expect(central).toContain(planOf({ fen: held, uci: 'f3e5', san: 'Ne5' }));
    const outpost = '4k3/p6p/8/8/3P4/5N2/8/4K3 w - - 0 1';
    expect(en.facts.outpost(KNIGHT)).toContain(planOf({ fen: outpost, uci: 'f3e5', san: 'Ne5' }));
  });

  it('sees a rook take an open or a half-open file', () => {
    const fen = '4k3/p3p3/8/8/8/8/P3P3/R3K3 w - - 0 1';
    expect(en.facts.openFile(false, false)).toContain(planOf({ fen, uci: 'a1b1', san: 'Rb1' }));
    const halfOpen = '4k3/pp6/8/8/8/8/P7/R3K3 w - - 0 1';
    expect(en.facts.openFile(true, false)).toContain(
      planOf({ fen: halfOpen, uci: 'a1b1', san: 'Rb1' }),
    );
  });

  it('sees a passed pawn made, then pushed', () => {
    const fen = '4k3/8/1p6/2P5/8/8/8/4K3 w - - 0 1';
    expect(planOf({ fen, uci: 'c5b6', san: 'cxb6' })).toBeNull();
    // Past the c-pawn, which can no longer take it.
    const made = '4k3/8/2p5/1P6/8/8/8/4K3 w - - 0 1';
    expect(en.facts.passedPawn(true)).toContain(planOf({ fen: made, uci: 'b5b6', san: 'b6' }));
    const stopped = '4k3/p7/8/1P6/8/8/8/4K3 w - - 0 1';
    expect(planOf({ fen: stopped, uci: 'b5b6', san: 'b6' })).toBeNull();
    const passed = '4k3/8/8/1P6/8/8/8/4K3 w - - 0 1';
    expect(en.facts.passedPawn(false)).toContain(planOf({ fen: passed, uci: 'b5b6', san: 'b6' }));
  });

  it('sees the king head for the center of an endgame', () => {
    const fen = '4k3/8/8/8/8/8/8/R5K1 w - - 0 1';
    expect(en.facts.centralKing).toContain(planOf({ fen, uci: 'g1f2', san: 'Kf2' }));
    const queens = '3qk3/8/8/8/8/8/8/3Q2K1 w - - 0 1';
    expect(planOf({ fen: queens, uci: 'g1f2', san: 'Kf2' })).toBeNull();
  });

  it('sees a central pawn take the center in the opening', () => {
    expect(en.facts.center).toContain(planOf({ fen: START, uci: 'e2e4', san: 'e4', ply: 1 }));
    expect(planOf({ fen: START, uci: 'e2e4', san: 'e4', ply: 41 })).toBeNull();
  });

  it('sees a piece chase one worth more, and pin one to what stands behind it', () => {
    const rook = { role: 'rook', color: 'black' } as const;
    const chased = '4k3/8/8/3r4/8/8/8/1N2K3 w - - 0 1';
    expect(en.facts.chases(rook, null)).toContain(planOf({ fen: chased, uci: 'b1c3', san: 'Nc3' }));
    const pinned = '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1';
    const knight = { role: 'knight', color: 'black' } as const;
    const king = { role: 'king', color: 'black' } as const;
    expect(en.facts.pins(knight, king)).toContain(planOf({ fen: pinned, uci: 'f1b5', san: 'Bb5' }));
  });

  it('sees no pin a pinned piece breaks by taking the pinner, unless that loses it', () => {
    const king = { role: 'king', color: 'black' } as const;
    // ...Rxe1+ takes the rook back at once.
    const rook = { role: 'rook', color: 'black' } as const;
    const even = planOf({ fen: '4k3/4r3/8/8/8/8/5PPP/R5K1 w - - 0 1', uci: 'a1e1', san: 'Re1' });
    expect(en.facts.pins(rook, king)).not.toContain(even);
    // ...Qxb5 wins a bishop, unless the a4 pawn takes the queen back.
    const queen = { role: 'queen', color: 'black' } as const;
    const free = planOf({ fen: '4k3/3q4/8/8/8/8/8/4KB2 w - - 0 1', uci: 'f1b5', san: 'Bb5' });
    expect(en.facts.pins(queen, king)).not.toContain(free);
    const held = planOf({ fen: '4k3/3q4/8/8/P7/8/8/4KB2 w - - 0 1', uci: 'f1b5', san: 'Bb5' });
    expect(en.facts.pins(queen, king)).toContain(held);
  });

  it('sees a rook reach the seventh rank, and rooks doubled or connected', () => {
    const seventh = '4k3/1p6/8/8/8/8/8/R3K3 w - - 0 1';
    expect(en.facts.seventhRank).toContain(planOf({ fen: seventh, uci: 'a1a7', san: 'Ra7' }));
    const doubled = '4k3/8/8/8/8/8/R7/3RK3 w - - 0 1';
    expect(en.facts.doublesRooks).toContain(planOf({ fen: doubled, uci: 'a2d2', san: 'Rd2' }));
    const connected = 'r5k1/8/8/8/8/8/8/R2Q1RK1 w - - 0 1';
    expect(en.facts.connectsRooks).toContain(
      planOf({ fen: connected, uci: 'd1d3', san: 'Qd3', ply: 41 }),
    );
  });

  it('sees a rook take a file it wasn’t on already', () => {
    const fen = '4k3/1p6/8/8/8/8/1P6/R3K3 w - - 0 1';
    expect(en.facts.openFile(false, false)).not.toContain(planOf({ fen, uci: 'a1a3', san: 'Ra3' }));
  });

  it('sees a pawn defend a piece, by its square when its side has two like it', () => {
    const fen = '2r1k3/p7/8/8/2N5/8/1P6/4K2N w - - 0 1';
    const knight = { role: 'knight', color: 'white' } as const;
    expect(en.facts.guards(knight, '[[s:c4]]')).toContain(planOf({ fen, uci: 'b2b3', san: 'b3' }));
  });

  it('sees luft made past the opening, on a back rank nothing guards', () => {
    const fen = 'r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1';
    expect(en.facts.luft).toContain(planOf({ fen, uci: 'h2h3', san: 'h3', ply: 41 }));
    expect(planOf({ fen, uci: 'h2h3', san: 'h3', ply: 21 })).toBeNull();
    const guarded = 'r5k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    expect(planOf({ fen: guarded, uci: 'h2h3', san: 'h3', ply: 41 })).toBeNull();
    // The square h3 leaves is the d6 bishop's: no way out for the king.
    const covered = 'r5k1/5ppp/3b4/8/8/8/5PPP/6K1 w - - 0 1';
    expect(en.facts.luft).not.toContain(planOf({ fen: covered, uci: 'h2h3', san: 'h3', ply: 41 }));
    // A pawn that attacks a piece does that first.
    const bishop = { role: 'bishop', color: 'black' } as const;
    const chasing = 'r5k1/5ppp/8/8/6b1/8/5PPP/6K1 w - - 0 1';
    expect(en.facts.chases(bishop, null)).toContain(
      planOf({ fen: chasing, uci: 'h2h3', san: 'h3', ply: 41 }),
    );
  });

  it('sees the king chase only a piece nothing defends', () => {
    const knight = { role: 'knight', color: 'black' } as const;
    const loose = '8/8/4k3/8/3n4/8/2K5/8 w - - 0 1';
    expect(en.facts.chases(knight, null)).toContain(
      planOf({ fen: loose, uci: 'c2c3', san: 'Kc3' }),
    );
    const defended = '8/8/4k3/4p3/3n4/8/2K5/8 w - - 0 1';
    expect(en.facts.chases(knight, null)).not.toContain(
      planOf({ fen: defended, uci: 'c2c3', san: 'Kc3' }),
    );
  });

  it('sees a chase by a line the move opens: a discovered attack', () => {
    const queen = { role: 'queen', color: 'black' } as const;
    const fen = '6k1/5ppp/8/7q/8/5N2/4B1PP/6K1 w - - 0 1';
    expect(en.facts.chases(queen, null)).toContain(planOf({ fen, uci: 'f3e5', san: 'Ne5' }));
  });

  it('sees no chase in a piece offered for one of the same worth', () => {
    const queen = { role: 'queen', color: 'black' } as const;
    const fen = '4k3/8/8/4q3/8/8/8/Q2RK3 w - - 0 1';
    expect(en.facts.chases(queen, null)).not.toContain(planOf({ fen, uci: 'a1d4', san: 'Qd4' }));
  });

  it('leaves the point of a move by a mate to the mate', () => {
    expect(planOf({ fen: START, uci: 'g1f3', san: 'Nf3', ply: 1, mate: true })).toBeNull();
  });
});
