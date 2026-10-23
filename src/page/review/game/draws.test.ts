import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { GamePosition } from '#page/review/judge/types.ts';
import { buildReview } from './build.ts';
import { drawnByRule, settleDraw } from './draws.ts';

// Nf3 Nf6 Ng1 Ng8, twice: the start comes back a third time, with White a queen up.
const START = '6nk/5ppp/8/8/8/8/5PPP/Q5NK w - - 0 1';
const LOOP: readonly (readonly [string, string, string])[] = [
  ['g1f3', 'Nf3', '6nk/5ppp/8/8/8/5N2/5PPP/Q6K b - - 1 1'],
  ['g8f6', 'Nf6', '7k/5ppp/5n2/8/8/5N2/5PPP/Q6K w - - 2 2'],
  ['f3g1', 'Ng1', '7k/5ppp/5n2/8/8/8/5PPP/Q5NK b - - 3 2'],
  ['f6g8', 'Ng8', '6nk/5ppp/8/8/8/8/5PPP/Q5NK w - - 4 3'],
];

/** The loop played `times` times, each position's counters as the game has them. */
function repeated(times: number): GamePosition[] {
  const nodes: GamePosition[] = [{ ply: 0, fen: START }];
  for (let lap = 0; lap < times; lap++)
    for (const [uci, san, fen] of LOOP) {
      const ply = nodes.length;
      const counters = `${ply} ${Math.floor(ply / 2) + 1}`;
      nodes.push({ ply, fen: fen.replace(/\d+ \d+$/, counters), uci, san });
    }
  return nodes;
}

const record = (whiteWinChance: number): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best: null,
  line: [],
});

describe('a draw by rule', () => {
  it('is the third time the last position comes, whatever its move counters', () => {
    expect(drawnByRule(repeated(1))).toBe(false);
    expect(drawnByRule(repeated(2))).toBe(true);
  });

  it('is fifty moves each without a capture or a pawn move', () => {
    expect(drawnByRule([{ ply: 0, fen: '7k/8/8/8/8/8/8/Q6K w - - 99 80' }])).toBe(false);
    expect(drawnByRule([{ ply: 0, fen: '7k/8/8/8/8/8/8/Q6K w - - 100 80' }])).toBe(true);
  });

  it('ends the game level, as the engine doesn’t see', () => {
    const nodes = repeated(2);
    const records = nodes.map(() => record(95));
    const settled = settleDraw(nodes, records);
    expect(settled.at(-1)).toMatchObject({ cp: 0, whiteWinChance: 50 });
    expect(settled.slice(0, -1)).toEqual(records.slice(0, -1));
    expect(settleDraw(repeated(1), records.slice(0, 5))).toEqual(records.slice(0, 5));
  });

  it('costs the move that draws nothing, for the side that was lost', () => {
    const nodes = repeated(2);
    // Black's last move draws a lost game; the engine read it as White's win going on.
    const deep = nodes.map((_, i) => record(i === nodes.length - 1 ? 95 : 50));
    const review = buildReview({
      nodes,
      deep,
      rough: [],
      moves: [],
      bookPly: 0,
      chess960: false,
      previous: null,
      rate: () => ({ white: null, black: null }),
    });
    const drawing = review.moves.at(-1);
    expect(drawing?.san).toBe('Ng8');
    expect(drawing?.loss).toBe(0);
    expect(review.positions.at(-1)).toMatchObject({ whiteWinChance: 50 });
  });
});
