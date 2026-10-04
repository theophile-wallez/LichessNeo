import { describe, expect, it } from 'vitest';
import { uciPosition } from './position.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('uciPosition', () => {
  it('gives the FEN alone right after a capture or pawn move', () => {
    const path = [
      { fen: START },
      { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', uci: 'e2e4' },
    ];
    expect(uciPosition(path, false)).toBe(`fen ${path[1]?.fen}`);
  });

  it('adds the moves since the last irreversible one, so a repetition shows', () => {
    const path = [
      { fen: START },
      { fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', uci: 'g1f3' },
      { fen: 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2', uci: 'g8f6' },
      { fen: 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 3 2', uci: 'f3g1' },
    ];
    expect(uciPosition(path, false)).toBe(`fen ${START} moves g1f3 g8f6 f3g1`);
  });

  it('starts from the first position it has when the clock reaches further back', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K3 b - - 40 60';
    const path = [{ fen: '4k3/8/8/8/8/8/8/4K2R w - - 39 60' }, { fen, uci: 'h1a1' }];
    expect(uciPosition(path, false)).toBe(`fen 4k3/8/8/8/8/8/8/4K2R w - - 39 60 moves h1a1`);
  });

  it('writes castling as the engine does, unless the game is Chess960', () => {
    const before = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 4 20';
    const after = 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 5 20';
    const path = [{ fen: before }, { fen: after, uci: 'e1h1' }];
    expect(uciPosition(path, false)).toBe(`fen ${before} moves e1g1`);
    expect(uciPosition(path, true)).toBe(`fen ${before} moves e1h1`);
  });

  // xiPhGUNi's 31. Rh1: taken for castling, the engine refused the line and said nothing.
  it('leaves a rook going from e1 to h1 as it is', () => {
    const before = '2rr4/p4kp1/1p5p/2p1Pp1b/3P1P2/1NP3K1/P5P1/2R1R3 w - - 2 31';
    const after = '2rr4/p4kp1/1p5p/2p1Pp1b/3P1P2/1NP3K1/P5P1/2R4R b - - 3 31';
    const path = [{ fen: before }, { fen: after, uci: 'e1h1' }];
    expect(uciPosition(path, false)).toBe(`fen ${before} moves e1h1`);
  });
});
