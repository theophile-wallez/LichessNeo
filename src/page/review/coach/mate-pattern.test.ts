import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { en } from '#page/review/i18n/en.ts';
import { mateBoard, matedBy, matePatternOf, withPattern } from './mate-pattern.ts';
import { freshTold } from './told.ts';

const boardOf = (fen: string) => parseFen(fen).board;

// The rook comes to e8: Black's king is shut in by its own pawns.
const BACK_RANK = '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1';

describe('matePatternOf', () => {
  it('names the back-rank mate', () => {
    expect(matePatternOf(boardOf('4R1k1/5ppp/8/8/8/8/8/6K1 b - - 1 1'), 'black')).toBe('backRank');
  });

  it('names the smothered mate', () => {
    expect(matePatternOf(boardOf('6rk/5Npp/8/8/8/8/8/6K1 b - - 1 1'), 'black')).toBe('smothered');
  });

  it('names the Arabian mate', () => {
    expect(matePatternOf(boardOf('7k/7R/5N2/8/8/8/8/6K1 b - - 1 1'), 'black')).toBe('arabian');
  });

  it('names the epaulette mate', () => {
    expect(matePatternOf(boardOf('3rkr2/8/4Q3/8/8/8/8/6K1 b - - 1 1'), 'black')).toBe('epaulette');
  });

  it('has no name for a queen’s mate on h7, nor for a king out of check', () => {
    expect(matePatternOf(boardOf('6k1/5p1Q/6p1/8/8/3B4/8/6K1 b - - 1 1'), 'black')).toBeNull();
    expect(matePatternOf(boardOf(BACK_RANK), 'black')).toBeNull();
  });

  it('wants two pawns in front of the king for a back-rank mate', () => {
    // A bishop and a knight wall the king in, beside a single pawn.
    const pieces = '4R1k1/5bpn/8/8/8/8/8/6K1 b - - 1 1';
    expect(matePatternOf(boardOf(pieces), 'black')).toBeNull();
  });
});

describe('mateBoard', () => {
  it('plays the engine’s mate out to its last board', () => {
    const record = toRecord(BACK_RANK, { lines: [{ mate: 1, pv: ['e1e8'] }] });
    const end = mateBoard(record, BACK_RANK);
    expect(end?.get('e8')).toEqual({ role: 'rook', color: 'white' });
    expect(end && matePatternOf(end, 'black')).toBe('backRank');
  });

  it('has none when the line stops short of the mate, or without a mate', () => {
    const short = toRecord(BACK_RANK, { lines: [{ mate: 2, pv: ['e1e8'] }] });
    expect(mateBoard(short, BACK_RANK)).toBeNull();
    const score = toRecord(BACK_RANK, { lines: [{ cp: 300, pv: ['e1e8'] }] });
    expect(mateBoard(score, BACK_RANK)).toBeNull();
  });
});

describe('withPattern', () => {
  const end = matedBy(BACK_RANK, 'e1e8');
  const backRank = en.facts.matePattern('backRank')[0];

  it('says the mate’s name after the text', () => {
    expect(withPattern('Checkmate.', end, { mated: 'black', facts: en.facts })).toBe(
      `Checkmate. ${backRank}`,
    );
  });

  it('says it once over the moves leading to it', () => {
    const told = freshTold(new Set(['matePattern:backRank:black']));
    expect(withPattern('Checkmate.', end, { mated: 'black', facts: en.facts, told })).toBe(
      'Checkmate.',
    );
  });

  it('says nothing more of a mate with no name', () => {
    expect(withPattern('Checkmate.', null, { mated: 'black', facts: en.facts })).toBe('Checkmate.');
  });
});

describe('matedBy', () => {
  it('plays the mating move on the board, when there is one', () => {
    expect(matedBy(BACK_RANK, 'e1e8')?.get('e8')).toEqual({ role: 'rook', color: 'white' });
    expect(matedBy(BACK_RANK, null)).toBeNull();
  });
});
