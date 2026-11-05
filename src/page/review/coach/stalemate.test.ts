import { describe, expect, it } from 'vitest';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { stalemateFact } from './stalemate.ts';

const inputOf = (move: MoveVerdict): FactInput => factInput(move);

// White's queen and king against the lone king in the corner.
const CORNER = 'k7/8/1K6/2Q5/8/8/8/8 w - - 0 1';
// Every White pawn is blocked, and Black's king takes the last squares from White's.
const BLOCKED = '8/8/1p1p4/pPpP4/P1P5/5k1p/7P/7K b - - 0 1';

describe('stalemateFact', () => {
  it('sees a won game thrown away', () => {
    const move = played({
      fen: CORNER,
      uci: 'c5c7',
      before: record(99, ['c5c6']),
      after: record(50),
    });
    expect(en.facts.stalemate(true)).toContain(stalemateFact(inputOf(move))?.text);
  });

  it('sees the losing side save itself', () => {
    const move = played({
      fen: BLOCKED,
      uci: 'f3f2',
      before: record(85, ['f3f2']),
      after: record(50),
    });
    expect(en.facts.stalemate(false)).toContain(stalemateFact(inputOf(move))?.text);
  });

  it('says nothing while the other side has a move', () => {
    const queen = played({
      fen: CORNER,
      uci: 'c5c6',
      before: record(99, ['c5c6']),
      after: record(99),
    });
    expect(stalemateFact(inputOf(queen))).toBeNull();
    const king = played({
      fen: BLOCKED,
      uci: 'f3e3',
      before: record(85, ['f3f2']),
      after: record(85),
    });
    expect(stalemateFact(inputOf(king))).toBeNull();
  });
});
