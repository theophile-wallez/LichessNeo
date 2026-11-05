import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { badBishopMade, isBadBishop, tradeFact } from './bishops.ts';

// The bishops a trade or a pawn's push leaves: bishops of opposite colors, a
// bad bishop traded off or made, the bishop pair won or given.

/** The trade `uci` from `fen`, which the engine's `reply` takes back. */
const trade = (fen: string, uci: string, reply: string) =>
  factInput(played({ fen, uci, before: record(50, [uci]), after: record(50, [reply]) }));

describe('isBadBishop', () => {
  // A French: White's pawns on c3, d4 and e5, the last two fixed by d5 and e6.
  const french = parseFen('4k3/8/4p3/3pP3/3P4/2P5/8/2B1KB2 w - - 0 1').board;

  it('sees the bishop of the color its fixed central pawns stand on', () => {
    expect(isBadBishop(french, 'c1', 'white')).toBe(true);
    expect(isBadBishop(french, 'f1', 'white')).toBe(false);
  });

  it('needs two of those pawns fixed', () => {
    const free = parseFen('4k3/8/4p3/4P3/3P4/2P5/8/2B1K3 w - - 0 1').board;
    expect(isBadBishop(free, 'c1', 'white')).toBe(false);
  });
});

describe('tradeFact', () => {
  it('sees bishops of opposite colors left alone with the pawns', () => {
    const input = trade('3r4/pp2k3/8/4b3/2B5/8/PP6/3R2K1 w - - 0 1', 'd1d8', 'e7d8');
    expect(en.facts.oppositeBishops(false)).toContain(tradeFact(input)?.text);
    // Even, after an error: nothing to say of it.
    expect(tradeFact(input, true)).toBeNull();
  });

  it('sees a bad bishop traded off', () => {
    const input = trade('r3k3/8/4p3/3pP3/1p1P4/b1P5/8/R1B1K3 w - - 0 1', 'c1a3', 'b4a3');
    expect(en.facts.badBishopOff).toContain(tradeFact(input)?.text);
  });

  it('sees the bishop pair won, and given', () => {
    const won = trade('4k3/5p2/4b3/2b5/3N4/8/8/2B1KB2 w - - 0 1', 'd4e6', 'f7e6');
    expect(en.facts.winsBishopPair('white')).toContain(tradeFact(won)?.text);
    const given = trade('4k3/5p2/4n3/2b2b2/2B5/8/8/2B1K3 w - - 0 1', 'c4e6', 'f7e6');
    expect(en.facts.givesBishopPair('black')).toContain(tradeFact(given, true)?.text);
  });

  it('sees a side behind in material trade pieces, after an error', () => {
    const input = trade('3r2k1/3r4/8/8/8/8/8/3R2K1 w - - 0 1', 'd1d7', 'd8d7');
    expect(en.facts.tradesWhenBehind).toContain(tradeFact(input, true)?.text);
  });

  it('says nothing when the engine doesn’t take back', () => {
    const input = trade('4k3/5p2/4b3/2b5/3N4/8/8/2B1KB2 w - - 0 1', 'd4e6', 'e8d8');
    expect(tradeFact(input)).toBeNull();
  });
});

describe('badBishopMade', () => {
  const fen = '4k3/7p/4p3/3p4/3PP3/2P5/7P/2B1K3 w - - 0 1';
  const push = (uci: string) =>
    factInput(played({ fen, uci, before: record(55, ['h2h3']), after: record(45, ['h7h6']) }));

  it('sees a push that fixes a third pawn on the bishop’s color', () => {
    expect(en.facts.makesBadBishop).toContain(badBishopMade(push('e4e5'))?.text);
  });

  it('says nothing of a push that leaves the bishop free', () => {
    expect(badBishopMade(push('h2h3'))).toBeNull();
  });

  it('says nothing of a bishop bad already', () => {
    const french = '4k3/7p/4p3/3pP3/3P4/2P5/7P/2B1K3 w - - 0 1';
    const move = played({ fen: french, uci: 'h2h3', before: record(55), after: record(45) });
    expect(badBishopMade(factInput(move))).toBeNull();
  });
});
