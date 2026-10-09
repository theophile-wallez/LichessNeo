import { describe, expect, it } from 'vitest';
import type { EngineResult } from '#page/review/engine/uci.ts';
import { uciPosition } from '#page/review/engine/position.ts';
import { quickReview } from './quick-review.ts';

// The fool's mate: 1. f3 e5 2. g4 Qh4#.
const POSITIONS = [
  { ply: 0, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  {
    ply: 1,
    fen: 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
    uci: 'f2f3',
    san: 'f3',
  },
  {
    ply: 2,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
    uci: 'e7e5',
    san: 'e5',
  },
  {
    ply: 3,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    uci: 'g2g4',
    san: 'g4',
  },
  {
    ply: 4,
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    uci: 'd8h4',
    san: 'Qh4#',
  },
];

// What the engine would say of each position, from the side to move's view.
const RESULTS: readonly EngineResult[] = [
  {
    lines: [
      { cp: 30, pv: ['e2e4'] },
      { cp: 25, pv: ['d2d4'] },
    ],
  },
  {
    lines: [
      { cp: 60, pv: ['e7e5'] },
      { cp: 50, pv: ['d7d5'] },
    ],
  },
  {
    lines: [
      { cp: -70, pv: ['b1c3'] },
      { cp: -80, pv: ['e2e4'] },
    ],
  },
  {
    lines: [
      { mate: 1, pv: ['d8h4'] },
      { cp: 150, pv: ['b8c6'] },
    ],
  },
  { lines: [{ mate: 0, pv: [] }] },
];

/** What the engine is sent for each position: its FEN, and the moves since the last irreversible one. */
const SENT = POSITIONS.map((_, i) => uciPosition(POSITIONS.slice(0, i + 1), false));

function fakeEngine(): { analyse: (position: string) => Promise<EngineResult>; asked: string[] } {
  const asked: string[] = [];
  const analyse = (position: string): Promise<EngineResult> => {
    asked.push(position);
    const index = SENT.indexOf(position);
    return Promise.resolve(RESULTS[index] ?? { lines: [] });
  };
  return { analyse, asked };
}

describe('quickReview', () => {
  it('searches every position once, in order, and says how far it got', async () => {
    const { analyse, asked } = fakeEngine();
    const progress: number[] = [];
    await quickReview({
      positions: POSITIONS,
      color: 'white',
      bookPly: 0,
      chess960: false,
      analyse,
      onProgress: share => progress.push(share),
    });
    expect(asked).toEqual(SENT);
    // The queen's move comes after a reversible one: the engine gets it with its move.
    expect(asked.at(-1)).toBe(`fen ${POSITIONS[3]?.fen} moves d8h4`);
    expect(progress).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('judges the player’s moves as the review does', async () => {
    const input = { positions: POSITIONS, bookPly: 0, chess960: false };
    const white = await quickReview({ ...input, color: 'white', analyse: fakeEngine().analyse });
    const black = await quickReview({ ...input, color: 'black', analyse: fakeEngine().analyse });
    expect(white.counts).toEqual({ inaccuracy: 1, blunder: 1 });
    expect(white.accuracy).toBeCloseTo(30.71, 2);
    expect(black.counts).toEqual({ best: 2 });
    expect(black.accuracy).toBeCloseTo(100, 2);
    // Where each class first comes, for the card's chips.
    expect(white.firstPlies).toEqual({ inaccuracy: 1, blunder: 3 });
    expect(black.firstPlies).toEqual({ best: 2 });
  });

  it('counts theory as theory, not as the player’s errors', async () => {
    const summary = await quickReview({
      positions: POSITIONS,
      color: 'white',
      bookPly: 3,
      chess960: false,
      analyse: fakeEngine().analyse,
    });
    expect(summary.counts).toEqual({ book: 2 });
  });
});
