import { describe, expect, it } from 'vitest';
import { playLine } from '#page/review/chess/played-line.ts';
import { played, playedBetween, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { blocksFact, castlingFact } from './castling.ts';
import type { FactInput } from './fact.ts';
import { lineOf } from './line-facts.ts';

const inputOf = (move: MoveVerdict): FactInput => factInput(move);

// 3.Bc4 against the Philidor: Bxf7+ drags Black's king out.
const ITALIAN = 'rnbqkbnr/ppp2ppp/3p4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 3';
const TAKEN = 'rnbqkbnr/ppp2Bpp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3';

const bishopTakes = (line: readonly string[], to = TAKEN): MoveVerdict =>
  playedBetween(
    [
      5,
      { fen: ITALIAN, lines: [{ cp: 150, pv: ['c4f7'] }] },
      { fen: to, lines: [{ cp: -150, pv: [...line] }] },
    ],
    'c4f7',
  );

describe('castlingFact', () => {
  it('sees the king dragged out of its castling by a check', () => {
    const text = castlingFact(inputOf(bishopTakes(['e8f7', 'f3g5'])))?.text;
    const line = lineOf(playLine(TAKEN, ['e8f7']), 'a');
    expect(en.facts.losesCastling('black', line)).toContain(text);
  });

  it('says nothing once the king couldn’t castle anyway', () => {
    const noRights = TAKEN.replace('KQkq', 'KQ');
    expect(castlingFact(inputOf(bishopTakes(['e8f7', 'f3g5'], noRights)))).toBeNull();
  });

  it('says nothing of a king that steps up unchecked', () => {
    // 3.d3, and the king walks to e7 of its own accord.
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 3';
    const quiet = playedBetween(
      [
        5,
        { fen: ITALIAN, lines: [{ cp: 30, pv: ['d2d3'] }] },
        { fen, lines: [{ cp: -30, pv: ['e8e7', 'c1g5'] }] },
      ],
      'd2d3',
    );
    expect(castlingFact(inputOf(quiet))).toBeNull();
  });
});

// Black's queen checks down the e-file; the knight from g1 steps in.
const CHECKING = '3q2k1/5ppp/8/8/8/8/5PPP/4K1N1 b - - 0 30';
const CHECKED = '6k1/4qppp/8/8/8/8/5PPP/4K1N1 w - - 1 31';
const check = played({
  fen: CHECKING,
  uci: 'd8e7',
  ply: 59,
  before: record(30, ['d8e7']),
  after: record(30),
});
const answer = (uci: string): MoveVerdict =>
  played({
    fen: CHECKED,
    uci,
    ply: 60,
    before: record(30, [uci]),
    after: record(30),
    previousMove: check,
  });

describe('blocksFact', () => {
  it('sees a piece step in to block the check', () => {
    const knight = { role: 'knight', color: 'white' } as const;
    expect(en.facts.blocksCheck(knight)).toContain(blocksFact(inputOf(answer('g1e2')))?.text);
  });

  it('isn’t said of the king stepping aside', () => {
    expect(blocksFact(inputOf(answer('e1d1')))).toBeNull();
  });

  it('needs a check to block', () => {
    const quiet = played({
      fen: CHECKING,
      uci: 'd8d7',
      ply: 59,
      before: record(30, ['d8d7']),
      after: record(30),
    });
    const fen = '6k1/3q1ppp/8/8/8/8/5PPP/4K1N1 w - - 1 31';
    const move = played({
      fen,
      uci: 'g1e2',
      ply: 60,
      before: record(30, ['g1e2']),
      after: record(30),
      previousMove: quiet,
    });
    expect(blocksFact(inputOf(move))).toBeNull();
  });
});
