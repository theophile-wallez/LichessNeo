import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { fixtureGames } from '#page/review/fixtures/replay.ts';
import {
  attackerSquares,
  attackerValues,
  exchangeGain,
  isHanging,
  isSacrifice,
} from './material.ts';
import { normalizeUci, sanOf, uciToSan } from './notation.ts';
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

describe('sanOf', () => {
  it('tells a piece from another like it by its file, else its rank', () => {
    expect(sanOf('6k1/8/8/8/8/8/8/R4RK1 w - - 0 1', 'f1d1')).toBe('Rfd1');
    expect(sanOf('R7/7k/8/8/8/8/8/R5K1 w - - 0 1', 'a1a4')).toBe('R1a4');
    expect(sanOf('6k1/8/8/8/8/8/8/R5K1 w - - 0 1', 'a1a4')).toBe('Ra4');
  });

  it('marks a check, which the original’s notation leaves out', () => {
    const fen = '6k1/8/8/8/8/8/8/R5K1 w - - 0 1';
    expect(sanOf(fen, 'a1a8')).toBe('Ra8+');
    expect(uciToSan(fen, 'a1a8')).toBe('Ra8');
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

/** What White wins by trading on `square` of `fen`. */
const gain = (fen: string, square: Square): number =>
  exchangeGain(parseFen(fen).board, square, 'white');

describe('material', () => {
  it('values an attacking king above everything', () => {
    const { board } = parseFen('8/8/8/8/3q4/4K3/8/8 w - - 0 1');
    expect(attackerValues(board, 'd4', 'white')).toEqual([100]);
    expect(isHanging(board, 'd4', { color: 'black', role: 'queen' })).toBe(true);
  });

  it('lists a square’s attackers cheapest first, the king last', () => {
    const { board } = parseFen('6k1/8/8/3p4/2P1K3/8/8/3Q4 w - - 0 1');
    expect(attackerSquares(board, 'd5', 'white')).toEqual(['c4', 'd1', 'e4']);
  });

  it('weighs a trade on a square, either side free to stop', () => {
    // Rxd5 Rxd5 loses the rook for the knight, unless a rook behind takes back.
    expect(gain('3r2k1/8/8/3n4/8/8/3R4/6K1 w - - 0 1', 'd5')).toBe(0);
    expect(gain('3r2k1/8/8/3n4/8/8/3R4/3R2K1 w - - 0 1', 'd5')).toBe(3);
    // A queen takes a pawn nothing defends, not one a pawn does.
    expect(gain('6k1/8/8/3p4/8/8/8/3Q2K1 w - - 0 1', 'd5')).toBe(1);
    expect(gain('6k1/8/2p5/3p4/8/8/8/3Q2K1 w - - 0 1', 'd5')).toBe(0);
    // A king takes only what nothing defends.
    expect(gain('6k1/8/8/3p4/4K3/8/8/8 w - - 0 1', 'd5')).toBe(1);
    expect(gain('6k1/8/2p5/3p4/4K3/8/8/8 w - - 0 1', 'd5')).toBe(0);
    expect(gain('6k1/8/8/8/4K3/8/8/8 w - - 0 1', 'd5')).toBe(0);
  });
});
