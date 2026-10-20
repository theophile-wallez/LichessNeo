import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { en } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { doubleThreatMarks, doubleThreatOf } from './double-threat.ts';
import { findings } from './fact.ts';

// lichess.org/HazZkamE: 13. Nf5 missed Qe4, which hits the rook on a8 and
// threatens Qxh7#, the bishop behind the queen.
const BEFORE = 'rnbq1rk1/p4ppp/1p1p1b2/4p3/3N2Q1/1P1B4/PBP2PPP/R4RK1 w - - 0 13';
const AFTER_NF5 = 'rnbq1rk1/p4ppp/1p1p1b2/4pN2/6Q1/1P1B4/PBP2PPP/R4RK1 b - - 1 13';

const nf5 = (line: readonly string[], fen = BEFORE): MoveVerdict =>
  judge({
    previousPosition: { ply: 24, fen },
    position: { ply: 25, fen: AFTER_NF5, uci: 'd4f5', san: 'Nf5' },
    before: {
      cp: 450,
      whiteWinChance: 85,
      secondLineWinChance: null,
      best: 'g4e4',
      line: [...line],
    },
    after: { cp: -90, whiteWinChance: 42, secondLineWinChance: null, best: 'g7g6' },
    book: false,
    chess960: false,
  });

describe('doubleThreatOf', () => {
  it('names the piece the move hits while it threatens mate, taken once the mate is parried', () => {
    expect(doubleThreatOf(nf5(['g4e4', 'g7g6', 'e4a8']))).toEqual({ role: 'rook', color: 'black' });
  });

  it('says nothing when the line takes something else', () => {
    expect(doubleThreatOf(nf5(['g4e4', 'g7g6', 'd4c6']))).toBeNull();
    expect(doubleThreatOf(nf5(['g4e4']))).toBeNull();
  });

  it('says nothing without a mate behind the threat', () => {
    // No bishop on d3: Qxh7+ is met by Kxh7.
    const noBishop = 'rnbq1rk1/p4ppp/1p1p1b2/4p3/3N2Q1/1P6/PBP2PPP/R4RK1 w - - 0 13';
    expect(doubleThreatOf(nf5(['g4e4', 'g7g6', 'e4a8'], noBishop))).toBeNull();
  });
});

describe('doubleThreatMarks', () => {
  it('draws the queen’s lines to the rook and to the mate, both ringed', () => {
    const after = boardAfter(parseFen(BEFORE).board, 'g4e4');
    expect(doubleThreatMarks(after, 'e4', { role: 'rook', color: 'black' })).toEqual([
      { kind: 'link', from: 'e4', to: 'a8', tone: 'attack' },
      { kind: 'link', from: 'e4', to: 'h7', tone: 'attack' },
      { kind: 'ring', square: 'a8', tone: 'attack' },
      { kind: 'ring', square: 'g8', tone: 'attack' },
    ]);
  });
});

describe('the better move’s reason', () => {
  it('is the double threat, said and drawn', () => {
    const fact = findings(nf5(['g4e4', 'g7g6', 'e4a8']), en).fact;
    expect(fact?.text).toContain('threatening mate and the [[p:br]]rook at once');
    expect(fact?.drawing).toContainEqual({ kind: 'link', from: 'e4', to: 'h7', tone: 'attack' });
  });
});
