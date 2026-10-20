import { describe, expect, it } from 'vitest';
import { judge } from '#page/review/judge/judge.ts';
import { oneOf } from './said.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const record = { cp: 0, whiteWinChance: 50, secondLineWinChance: null, best: null };

// The mover's side as the position before the move says, by the ply.
const before = (ply: number): string => (ply % 2 === 1 ? START : START.replace(' w ', ' b '));

const opening = (uci: string, ply = 1) =>
  judge({
    previousPosition: { ply: ply - 1, fen: before(ply) },
    position: { ply, fen: START, uci, san: uci },
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

  it('says it another way than the two moves before, from three ways', () => {
    for (const ply of [1, 2, 7, 20]) {
      const run = [ply, ply + 1, ply + 2].map(each => oneOf(WAYS, opening('e2e4', each)));
      expect(new Set(run).size, `from ply ${ply}`).toBe(3);
    }
  });

  it('picks from two ways by the move itself', () => {
    const moves = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3', 'g2g3', 'f2f4', 'b2b3'];
    const picked = new Set(moves.map(uci => oneOf(['one', 'two'], opening(uci))));
    expect(picked.size).toBe(2);
  });
});
