import { describe, expect, it } from 'vitest';
import { moveToken } from '#page/review/comment/tokens.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { inBetweenFact } from './in-between.ts';

const inputOf = (move: MoveVerdict): FactInput => factInput(move);

// Black's bishop takes the knight on f3; White checks from d3 before taking back.
const BEFORE = 'r7/ppq2ppk/8/8/6b1/5N2/PP3PPP/3Q2K1 b - - 0 20';
const TOOK = 'r7/ppq2ppk/8/8/8/5b2/PP3PPP/3Q2K1 w - - 0 21';
const takes = played({
  fen: BEFORE,
  uci: 'g4f3',
  ply: 40,
  before: record(50, ['g4f3']),
  after: record(50),
});

const answer = (uci: string, line: readonly string[]): MoveVerdict =>
  played({
    fen: TOOK,
    uci,
    ply: 41,
    before: record(50, [uci]),
    after: record(50, line),
    previousMove: takes,
  });

describe('inBetweenFact', () => {
  it('sees a check slipped in before taking back', () => {
    const move = answer('d1d3', ['h7g8', 'g2f3']);
    const retake = moveToken('gxf3', 'white', { base: 'a', ucis: ['h7g8', 'g2f3'] });
    expect(en.facts.inBetween(retake, true)).toContain(inBetweenFact(inputOf(move))?.text);
  });

  it('isn’t said of the recapture itself', () => {
    expect(inBetweenFact(inputOf(answer('g2f3', ['c7e5', 'd1d3'])))).toBeNull();
  });

  it('needs the line to take back on the square', () => {
    expect(inBetweenFact(inputOf(answer('d1d3', ['h7g8', 'a2a3'])))).toBeNull();
    // The bishop blocks on e4, and the queen comes to an empty f3.
    expect(inBetweenFact(inputOf(answer('d1d3', ['f3e4', 'd3f3'])))).toBeNull();
  });
});
