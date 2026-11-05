import { describe, expect, it } from 'vitest';
import { type Piece } from '#shared/chess/index.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { desperadoFact } from './desperado.ts';
import type { FactInput } from './fact.ts';

const inputOf = (move: MoveVerdict): FactInput => factInput(move);

const BISHOP: Piece = { role: 'bishop', color: 'white' };

/** Black's knight takes on e4 from `fen`; White's bishop on g5 takes on e7, the queen taking back. */
function desperado(fen: string, best = 'g5e7'): MoveVerdict {
  const takes = played({
    fen,
    uci: 'f6e4',
    ply: 39,
    before: record(50, ['f6e4']),
    after: record(50),
  });
  return played({
    fen: takes.position.fen,
    uci: 'g5e7',
    ply: 40,
    before: record(50, [best]),
    after: record(50, ['d8e7']),
    previousMove: takes,
  });
}

// The h6 pawn hits the bishop on g5, walled in by its own pawns on f4 and h4.
const HIT = '3q1rk1/4bpp1/5n1p/6B1/4PP1P/8/6P1/3Q1RK1 b - - 0 20';

describe('desperadoFact', () => {
  it('sees a doomed piece take something before it goes', () => {
    expect(en.facts.desperado(BISHOP)).toContain(
      desperadoFact(inputOf(desperado(HIT)), BISHOP)?.text,
    );
  });

  it('isn’t a desperado for a piece that wasn’t lost', () => {
    // With Black's pawn on h7, only the bishop on e7 hits g5, which the pawns defend.
    const safe = '3q1rk1/4bppp/5n2/6B1/4PP1P/8/6P1/3Q1RK1 b - - 0 20';
    expect(desperadoFact(inputOf(desperado(safe)), BISHOP)).toBeNull();
  });

  it('isn’t one for a piece that could step away to safety', () => {
    // Bh4 saved the bishop: taking on e7 is a trade.
    const free = '3q1rk1/4bpp1/5n1p/6B1/4P3/8/5PPP/3Q1RK1 b - - 0 20';
    expect(desperadoFact(inputOf(desperado(free)), BISHOP)).toBeNull();
  });

  it('isn’t one when the engine had a better move', () => {
    expect(desperadoFact(inputOf(desperado(HIT, 'g5h6')), BISHOP)).toBeNull();
  });
});
