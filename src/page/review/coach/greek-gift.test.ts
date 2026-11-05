import { describe, expect, it } from 'vitest';
import { playedBetween } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { giftLetFact, withGift } from './greek-gift.ts';
import { type Fact, said } from './said.ts';

const inputOf = (move: MoveVerdict): FactInput => factInput(move);

// The classic setup: Bd3 at h7, Nf3 to come to g5, the queen to h5.
const GIFT = 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 7';
const TAKEN = 'rnbq1rk1/pppn1ppB/4p3/3pP3/1b1P4/2N2N2/PPP2PPP/R1BQK2R b KQ - 0 7';
// The knight on e2 can't reach g5.
const NO_KNIGHT = 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB4/PPP1NPPP/R1BQK2R w KQ - 0 7';
const NO_KNIGHT_TAKEN = 'rnbq1rk1/pppn1ppB/4p3/3pP3/1b1P4/2N5/PPP1NPPP/R1BQK2R b KQ - 0 7';

/** Bxh7+ from `from` to `to`, the engine scoring it `cp` from Black's side after. */
const sacrifice = (cp: number, from = GIFT, to = TAKEN): MoveVerdict =>
  playedBetween(
    [
      13,
      { fen: from, lines: [{ cp: 300, pv: ['d3h7'] }] },
      { fen: to, lines: [{ cp, pv: ['g8h7'] }] },
    ],
    'd3h7',
  );

const MATE: Fact = said('And mate follows.', 'mate');

describe('withGift', () => {
  it('names the Greek gift the engine says works', () => {
    const fact = withGift(inputOf(sacrifice(-300)), null);
    expect(en.facts.greekGift('h7')).toContain(fact?.text);
    expect(fact?.theme).toBe('sacrifice');
  });

  it('says the mate it leads to after it', () => {
    const text = withGift(inputOf(sacrifice(-300)), MATE)?.text;
    expect(en.facts.greekGift('h7').map(gift => `${gift} ${MATE.text}`)).toContain(text);
  });

  it('leaves the coach’s fact to a sacrifice that fails', () => {
    expect(withGift(inputOf(sacrifice(200)), MATE)).toBe(MATE);
  });

  it('needs a knight to come to g5', () => {
    expect(withGift(inputOf(sacrifice(-300, NO_KNIGHT, NO_KNIGHT_TAKEN)), null)).toBeNull();
  });
});

describe('giftLetFact', () => {
  // 6...Bb4?, and White's bishop can take on h7.
  const before = 'rnbq1rk1/pppnbppp/4p3/3pP3/3P4/2NB1N2/PPP2PPP/R1BQK2R b KQ - 5 6';
  const error = (cp: number): MoveVerdict =>
    playedBetween(
      [
        12,
        { fen: before, lines: [{ cp: 0, pv: ['c7c5'] }] },
        { fen: GIFT, lines: [{ cp, pv: ['d3h7', 'g8h7'] }] },
      ],
      'e7b4',
    );

  it('says the error lets the Greek gift in', () => {
    const input = inputOf(error(300));
    const fact = giftLetFact(input);
    expect(en.facts.letsGreekGift(input.reply)).toContain(fact?.text);
    expect(fact?.theme).toBe('sacrifice');
  });

  it('says nothing when the engine says the gift doesn’t work', () => {
    expect(giftLetFact(inputOf(error(0)))).toBeNull();
  });
});
