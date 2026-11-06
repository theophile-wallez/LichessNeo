import { describe, expect, it } from 'vitest';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { checkFact } from './check-fact.ts';

// Black's queen checks from a7; White's queen blocks on d4, checking back.
const checked = played({
  fen: 'q2k4/8/8/8/8/8/8/3Q2K1 b - - 0 30',
  uci: 'a8a7',
  ply: 59,
  before: record(50, ['a8a7']),
  after: record(50),
});
const CHECKED = '3k4/q7/8/8/8/8/8/3Q2K1 w - - 1 31';

const answer = (fen: string, previousMove = checked) =>
  played({
    fen,
    uci: 'd1d4',
    ply: 60,
    before: record(50, ['d1d4']),
    after: record(50),
    previousMove,
  });

describe('checkFact', () => {
  it('says a check that answers a check, and draws it', () => {
    const fact = checkFact(factInput(answer(CHECKED)));
    expect(en.facts.counterCheck('black')).toContain(fact?.text);
    expect(fact?.drawing).toEqual({
      topic: 'checks',
      marks: [
        { kind: 'link', from: 'd4', to: 'd8', tone: 'attack' },
        { kind: 'ring', square: 'd8', tone: 'attack' },
      ],
    });
  });

  it('says a check out of the blue forces the reply, with nothing drawn', () => {
    const quiet = played({
      fen: '3k3q/8/8/8/8/8/8/3Q2K1 b - - 0 30',
      uci: 'h8h7',
      ply: 59,
      before: record(50, ['h8h7']),
      after: record(50),
    });
    const fact = checkFact(factInput(answer('3k4/7q/8/8/8/8/8/3Q2K1 w - - 1 31', quiet)));
    expect(en.facts.checkForces('black')).toContain(fact?.text);
    expect(fact).not.toHaveProperty('drawing');
  });

  it('says nothing of a move that doesn’t check', () => {
    const fen = '4k3/q7/8/8/8/8/8/3Q2K1 w - - 1 31';
    expect(checkFact(factInput(answer(fen)))).toBeNull();
  });
});
