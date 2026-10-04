import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { fixtureGames } from '#page/review/fixtures/replay.ts';
import { attackerValues, isHanging, isSacrifice } from './material.ts';
import { normalizeUci, uciToSan } from './notation.ts';
// What the original script wrote for these moves.
import legacy from './fixtures/legacy.json' with { type: 'json' };

describe('uciToSan', () => {
  it('writes moves as the original did', () => {
    for (const [fen, uci, san] of legacy.san)
      expect(uciToSan(String(fen), uci), `${uci}`).toBe(san);
  });

  it('reads castling both ways', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(uciToSan(fen, 'e1h1')).toBe('O-O');
    expect(uciToSan(fen, 'e1c1')).toBe('O-O-O');
    expect(uciToSan(fen, 'e1f1')).toBe('Kf1');
  });
});

describe('normalizeUci', () => {
  // The kings on their squares, as for every castling of the original's cases.
  const castlingFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

  it('turns Lichess’s castling into the engine’s outside Chess960', () => {
    for (const [uci, chess960, normalized] of legacy.norm)
      expect(
        normalizeUci(typeof uci === 'string' ? uci : undefined, castlingFen, chess960 === true) ??
          null,
      ).toBe(normalized);
  });

  it('leaves the same squares alone for a rook, as only a king castles', () => {
    expect(normalizeUci('e1h1', '4k3/8/8/8/8/8/5K2/4R3 w - - 0 1', false)).toBe('e1h1');
    expect(normalizeUci('e8a8', '4r3/5k2/8/8/8/8/8/4K3 b - - 0 1', false)).toBe('e8a8');
  });
});

describe('isSacrifice', () => {
  it('finds the sacrifices the original found', () => {
    const expected = [...legacy.sacrifices];
    for (const game of fixtureGames())
      for (const [i, node] of game.nodes.slice(1).entries())
        expect(isSacrifice(game.nodes[i]?.fen ?? '', node.fen, node.uci ?? '')).toBe(
          expected.shift(),
        );
    expect(expected).toHaveLength(0);
  });

  it('is not a trade', () => {
    // Rxd5, taking a rook defended by a pawn: an even trade.
    const before = '4k3/8/4p3/3r4/8/8/8/3RK3 w - - 0 1';
    const after = '4k3/8/4p3/3R4/8/8/8/4K3 b - - 0 1';
    expect(isSacrifice(before, after, 'd1d5')).toBe(false);
  });
});

describe('material', () => {
  it('values an attacking king above everything', () => {
    const { board } = parseFen('8/8/8/8/3q4/4K3/8/8 w - - 0 1');
    expect(attackerValues(board, 'd4', 'white')).toEqual([100]);
    expect(isHanging(board, 'd4', { color: 'black', role: 'queen' })).toBe(true);
  });
});
