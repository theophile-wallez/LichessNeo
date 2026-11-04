import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import {
  countPieces,
  finalNet,
  gives,
  materialBalance,
  netWithin,
  securedSwing,
  worthSaying,
} from './swing.ts';

const line = (fen: string, moves: string) => playLine(fen, moves.split(' '));

// White's knight forks the king and the rook, then takes it.
const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
// A bishop for a knight on d5, the pawn taking back.
const TRADE = '4k3/8/4p3/3n4/8/5B2/8/4K3 w - - 0 1';

describe('netWithin', () => {
  it('is what a side is ahead where the line last settles within the plies given', () => {
    const fork = line(FORK, 'd5c7 e8d7 c7a8 d7c8');
    expect(netWithin(fork, 'white', 2)).toBe(0);
    expect(netWithin(fork, 'white', 3)).toBe(5);
  });
});

describe('securedSwing', () => {
  it('is what a side takes once the trades are over', () => {
    const won = securedSwing(line(FORK, 'd5c7 e8d7 c7a8 d7c8'), 'white');
    expect(won).toEqual({
      won: [{ role: 'rook', color: 'black' }],
      lost: [],
      net: 5,
      plies: 3,
      square: null,
    });
  });

  it('says where the piece won was, when its side had more than one like it', () => {
    const pawns = '4k3/8/8/3p4/4P3/8/p7/4K3 w - - 0 1';
    expect(securedSwing(line(pawns, 'e4d5 e8e7'), 'white')?.square).toBe('[[s:d5]]');
    expect(securedSwing(line(FORK, 'd5c7 e8d7 c7a8 d7c8'), 'white')?.square).toBeNull();
  });

  it('names no square the piece won came to in the line, another piece there now', () => {
    // Bxg3+ Rxg3 Qxg3: the rook is taken on g3, where the knight stands.
    const knight = '3k4/8/3b4/8/8/5qNR/8/R3K3 b - - 0 1';
    const won = securedSwing(line(knight, 'd6g3 h3g3 f3g3 e1d1'), 'black');
    expect(won?.won).toEqual([{ role: 'rook', color: 'white' }]);
    expect(won?.square).toBeNull();
  });

  it('leaves out a trade of pieces of the same worth', () => {
    expect(securedSwing(line(TRADE, 'f3d5 e6d5 e1e2'), 'white')).toBeNull();
    expect(finalNet(line(TRADE, 'f3d5 e6d5 e1e2'), 'white')).toBe(0);
  });

  it('cancels a piece won against one lost of the same worth', () => {
    // A bishop for the knight on d5, then the rook taken.
    const fen = 'r3k3/8/4p3/3n4/8/5B2/8/R3K3 w - - 0 1';
    const won = securedSwing(line(fen, 'f3d5 e6d5 a1a8 e8e7 e1e2'), 'white');
    expect(won?.won).toEqual([{ role: 'rook', color: 'black' }]);
    expect(won?.lost).toEqual([]);
  });

  it('counts nothing on the line’s last ply, what comes after it unknown', () => {
    expect(securedSwing(line(FORK, 'd5c7 e8d7 c7a8'), 'white')).toBeNull();
  });

  it('wants the gain kept to the line’s end', () => {
    // The rook taken, then the queen lost.
    const fen = 'r3k3/5b2/8/3N3Q/8/8/8/4K3 w - - 0 1';
    expect(securedSwing(line(fen, 'd5c7 e8d7 c7a8 d7d6 e1e2 f7h5 e2e3'), 'white')).toBeNull();
  });

  it('says nothing of a line with a promotion', () => {
    const fen = '1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    expect(securedSwing(line(fen, 'a7b8q e8d7 e1e2'), 'white')).toBeNull();
  });
});

describe('gives', () => {
  it('sees a piece left where the next ply takes it', () => {
    const fen = '4k3/8/4p3/8/8/5N2/8/4K3 w - - 0 1';
    expect(gives(line(fen, 'f3d4 e6e5'), 'white', [0, 2])).toBe(false);
    expect(gives(line(fen, 'f3d5 e6d5'), 'white', [0, 2])).toBe(true);
  });

  it('sees no gift in taking a piece worth as much', () => {
    expect(gives(line(TRADE, 'f3d5 e6d5'), 'white', [0, 2])).toBe(false);
  });
});

describe('worthSaying', () => {
  it('wants more than a pawn from a trade of unlike pieces', () => {
    const knight = { role: 'knight', color: 'black' } as const;
    const pawn = { role: 'pawn', color: 'white' } as const;
    expect(worthSaying({ won: [knight], lost: [], net: 3, plies: 2, square: null })).toBe(true);
    expect(worthSaying({ won: [pawn], lost: [], net: 1, plies: 2, square: null })).toBe(true);
    expect(
      worthSaying({ won: [knight, knight], lost: [pawn], net: 1, plies: 4, square: null }),
    ).toBe(false);
  });
});

describe('materialBalance', () => {
  it('is a side’s material less the other’s', () => {
    expect(materialBalance(parseFen(FORK).board, 'white')).toBe(-2);
    expect(materialBalance(parseFen(FORK).board, 'black')).toBe(2);
  });
});

describe('countPieces', () => {
  it('counts pieces by kind, in their order', () => {
    const pawn = { role: 'pawn', color: 'black' } as const;
    const knight = { role: 'knight', color: 'black' } as const;
    expect(countPieces([pawn, knight, pawn])).toEqual([
      { piece: pawn, count: 2 },
      { piece: knight, count: 1 },
    ]);
  });
});
