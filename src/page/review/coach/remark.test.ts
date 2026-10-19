import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import { remark } from './remark.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const record = (whiteWinChance: number, best: string | null): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best,
});

/** The remarks on White's best 1. e4 to a position worth `whiteWinChance`, over many games. */
function remarksAt(whiteWinChance: number): Set<string> {
  const move = judge({
    previousPosition: { ply: 0, fen: START },
    position: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    before: record(whiteWinChance, 'e2e4'),
    after: record(whiteWinChance, 'e7e5'),
    book: false,
    chess960: false,
  });
  expect(move.moveClass).toBe('best');
  const games = Array.from({ length: 24 }, (_, i) => `game${String(i).padStart(4, '0')}`);
  return new Set(games.map(gameId => remark(move, { gameId, coach: 1, language: en })));
}

describe('remark', () => {
  it('gives advice on a won or a lost game, among the class’s words', () => {
    const { best, winning, defending } = en.remarks('white');
    for (const [whiteWinChance, advice] of [
      [96, winning],
      [4, defending],
    ] as const) {
      const said = [...remarksAt(whiteWinChance)];
      expect(said.some(text => advice.includes(text))).toBe(true);
      expect(said.every(text => advice.includes(text) || best.includes(text))).toBe(true);
    }
  });

  it('keeps to the class’s words in a game still open', () => {
    const { best } = en.remarks('white');
    expect([...remarksAt(50)].every(text => best.includes(text))).toBe(true);
  });
});
