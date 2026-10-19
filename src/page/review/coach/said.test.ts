import { describe, expect, it } from 'vitest';
import { judge } from '#page/review/judge/judge.ts';
import { oneOf } from './said.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const record = { cp: 0, whiteWinChance: 50, secondLineWinChance: null, best: null };

const opening = (uci: string) =>
  judge({
    previousPosition: { ply: 0, fen: START },
    position: { ply: 1, fen: START, uci, san: uci },
    before: record,
    after: record,
    book: false,
    chess960: false,
  });

describe('oneOf', () => {
  const WAYS = ['first', 'second', 'third'] as const;

  it('says a move’s fact the same way each time', () => {
    expect(oneOf(WAYS, opening('e2e4'))).toBe(oneOf(WAYS, opening('e2e4')));
  });

  it('says it in other ways for other moves', () => {
    const moves = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3', 'g2g3', 'f2f4', 'b2b3'];
    const picked = new Set(moves.map(uci => oneOf(WAYS, opening(uci))));
    expect(picked.size).toBeGreaterThan(1);
  });
});
