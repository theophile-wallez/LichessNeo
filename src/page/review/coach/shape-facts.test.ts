import { describe, expect, it } from 'vitest';
import { boardAfter } from '#page/review/chess/line.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import {
  doubledFact,
  fianchettoGoneFact,
  kingWalkFact,
  knightOnRimFact,
  loosensKingFact,
} from './shape-facts.ts';

// The shape a move leaves: doubled pawns, the king's cover pushed, the king
// walked out, a knight on the rim, a fianchetto's bishop traded off.

/** The move `uci` from `fen`, the engine answering `reply`, White's chance at `chance`. */
const move = (fen: string, uci: string, reply = '', chance = 45) =>
  factInput(
    played({ fen, uci, before: record(50, [uci]), after: record(chance, reply ? [reply] : []) }),
  );

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const HOLES = ['[[s:f3]]', '[[s:h3]]'] as const;

describe('doubledFact', () => {
  // Bxf6, and gxf6 doubles Black's f-pawns.
  const fen = 'rnbqkb1r/pppp1ppp/4pn2/6B1/3P4/8/PPP1PPPP/RN1QKBNR w KQkq - 0 3';

  it('sees the pawn that takes back doubled on its file', () => {
    const reply = moveToken('gxf6', 'black', { base: 'a', ucis: ['g7f6'] });
    expect(en.facts.doubledPawns('black', reply, 'f')).toContain(
      doubledFact(move(fen, 'g5f6', 'g7f6'))?.text,
    );
  });

  it('says nothing when a piece takes back, or the game is decided', () => {
    expect(doubledFact(move(fen, 'g5f6', 'd8f6'))).toBeNull();
    expect(doubledFact(move(fen, 'g5f6', 'g7f6', 95))).toBeNull();
  });
});

describe('loosensKingFact', () => {
  const castled = '3qk3/8/8/8/8/8/5PPP/3Q2K1 w - - 0 1';

  it('sees a pawn pushed from in front of the castled king', () => {
    expect(en.facts.loosensKing).toContain(loosensKingFact(move(castled, 'g2g4'))?.text);
  });

  it('names the holes of a fianchetto with no bishop to fill it', () => {
    expect(en.facts.fianchettoHoles('[[s:g3]]', HOLES)).toContain(
      loosensKingFact(move(castled, 'g2g3'))?.text,
    );
  });

  it('says nothing with the queens off', () => {
    expect(loosensKingFact(move('4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1', 'g2g4'))).toBeNull();
  });
});

describe('kingWalkFact', () => {
  it('sees the king give up castling, or walk up the board', () => {
    const rights = 'r2qk2r/8/8/8/8/8/8/R2QK2R w KQkq - 0 1';
    expect(en.facts.kingWalk(true)).toContain(kingWalkFact(move(rights, 'e1e2'))?.text);
    const walk = '3qk3/8/8/8/8/8/5PKP/3Q1R2 w - - 0 1';
    expect(en.facts.kingWalk(false)).toContain(kingWalkFact(move(walk, 'g2g3'))?.text);
  });

  it('says nothing of a step along the back rank, nor of one with the queens off', () => {
    expect(kingWalkFact(move('3qk3/8/8/8/8/8/5PPP/3Q2K1 w - - 0 1', 'g1h1'))).toBeNull();
    expect(kingWalkFact(move('4k3/8/8/8/8/8/5PKP/5R2 w - - 0 1', 'g2g3'))).toBeNull();
  });
});

describe('knightOnRimFact', () => {
  it('sees a knight sent to the edge, not one to the center', () => {
    expect(en.facts.knightOnRim('[[s:a3]]')).toContain(knightOnRimFact(move(START, 'b1a3'))?.text);
    expect(knightOnRimFact(move(START, 'b1c3'))).toBeNull();
  });
});

describe('fianchettoGoneFact', () => {
  it('sees the mover give up its fianchetto bishop in a trade', () => {
    const fen = 'r1bqkbnr/pppppppp/2n5/8/8/6P1/PPPPPPBP/RNBQ1RK1 w - - 0 1';
    const input = move(fen, 'g2c6', 'd7c6');
    const settled = boardAfter(input.after, 'd7c6');
    expect(en.facts.fianchettoBishopGone('white', HOLES)).toContain(
      fianchettoGoneFact(input, settled, true)?.text,
    );
  });

  it('sees the other side’s fianchetto bishop taken', () => {
    const fen = 'rn1qkbnr/pbpppppp/1p6/8/8/6P1/PPPPPPBP/RNBQ1RK1 b - - 0 1';
    const input = move(fen, 'b7g2', 'g1g2');
    const settled = boardAfter(input.after, 'g1g2');
    expect(en.facts.fianchettoBishopGone('white', HOLES)).toContain(
      fianchettoGoneFact(input, settled, false)?.text,
    );
  });

  it('says nothing when the king isn’t castled behind it', () => {
    const fen = 'r1bqkbnr/pppppppp/2n5/8/8/6P1/PPPPPPBP/RNBQK1NR w KQkq - 0 1';
    const input = move(fen, 'g2c6', 'd7c6');
    expect(fianchettoGoneFact(input, boardAfter(input.after, 'd7c6'), true)).toBeNull();
  });
});
