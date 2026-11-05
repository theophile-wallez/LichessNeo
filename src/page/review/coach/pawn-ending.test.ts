import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { pawnEndingFact } from './pawn-ending.ts';

// A trade into kings and pawns: won, or a win let go.

// Rxd8 Kxd8 leaves two pawns against one.
const FEN = '3r4/4k1p1/8/8/8/8/5PP1/3R2K1 w - - 0 1';
const SETTLED = boardAfter(boardAfter(parseFen(FEN).board, 'd1d8'), 'e7d8');

/** The trade Rxd8, White's win chance going from `before` to `after`. */
const trade = (before: number, after: number) =>
  factInput(
    played({
      fen: FEN,
      uci: 'd1d8',
      before: record(before, ['d1d8']),
      after: record(after, ['e7d8']),
    }),
  );

describe('pawnEndingFact', () => {
  it('sees a trade into a won pawn ending', () => {
    expect(en.facts.wonPawnEnding).toContain(pawnEndingFact(trade(95, 95), SETTLED, false)?.text);
    expect(pawnEndingFact(trade(60, 60), SETTLED, false)).toBeNull();
  });

  it('sees an error trade a win into a pawn ending drawn or lost', () => {
    const drawn = pawnEndingFact(trade(80, 50), SETTLED, true);
    expect(en.facts.lostPawnEnding(false)).toContain(drawn?.text);
    const lost = pawnEndingFact(trade(80, 20), SETTLED, true);
    expect(en.facts.lostPawnEnding(true)).toContain(lost?.text);
  });

  it('says nothing while pieces are left', () => {
    const pieces = boardAfter(parseFen(FEN).board, 'd1d8');
    expect(pawnEndingFact(trade(95, 95), pieces, false)).toBeNull();
  });
});
