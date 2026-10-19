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
  readonly mate?: boolean;
}

/** What the coach says of the move's plan, as the engine's best; one of the ways to say it. */
function planOf({ fen, uci, san, ply = 20, mate = false }: Move): string | null {
  const score = mate ? { mate: 4 } : { cp: 0 };
  const record = { ...score, whiteWinChance: 50, secondLineWinChance: null, best: uci };
  const move = judge({
    previousPosition: { ply: ply - 1, fen },
    position: { ply, fen, uci, san },
    before: record,
    after: { ...record, best: null },
    book: false,
    chess960: false,
  });
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

  it('sees a knight settle where no pawn can chase it', () => {
    const fen = '4k3/p6p/8/8/3P4/2N5/8/4K3 w - - 0 1';
    expect(planOf({ fen, uci: 'c3e4', san: 'Ne4' })).toBeNull();
    const chased = '4k3/p4p2/8/8/3P4/5N2/8/4K3 w - - 0 1';
    expect(planOf({ fen: chased, uci: 'f3e5', san: 'Ne5' })).toBeNull();
    const held = '4k3/p6p/8/3P4/8/5N2/8/4K3 w - - 0 1';
    expect(planOf({ fen: held, uci: 'f3e5', san: 'Ne5' })).toBeNull();
    const outpost = '4k3/p6p/8/8/3P4/5N2/8/4K3 w - - 0 1';
    expect(en.facts.outpost(KNIGHT)).toContain(planOf({ fen: outpost, uci: 'f3e5', san: 'Ne5' }));
  });

  it('sees a rook take an open or a half-open file', () => {
    const fen = '4k3/p3p3/8/8/8/8/P3P3/R3K3 w - - 0 1';
    expect(en.facts.openFile(false)).toContain(planOf({ fen, uci: 'a1b1', san: 'Rb1' }));
    const halfOpen = '4k3/pp6/8/8/8/8/P7/R3K3 w - - 0 1';
    expect(en.facts.openFile(true)).toContain(planOf({ fen: halfOpen, uci: 'a1b1', san: 'Rb1' }));
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

  it('leaves the point of a move by a mate to the mate', () => {
    expect(planOf({ fen: START, uci: 'g1f3', san: 'Nf3', ply: 1, mate: true })).toBeNull();
  });
});
