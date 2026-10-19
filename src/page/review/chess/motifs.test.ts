import { describe, expect, it } from 'vitest';
import { type Color, fenTurn, opposite } from '#shared/chess/index.ts';
import { lineMotif } from './motifs.ts';
import { playLine } from './played-line.ts';

/** The motif of the whole line, won by the side to move, or by `winner`. */
function motifOf(fen: string, line: string, winner: Color = fenTurn(fen)) {
  const plies = playLine(fen, line.split(' '));
  return lineMotif(plies, winner, plies.length);
}

const piece = (color: Color, role: string) => ({ color, role });

describe('lineMotif', () => {
  it('finds a knight forking the king and a rook', () => {
    expect(motifOf('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7 e8d7 c7a8')).toEqual({
      kind: 'fork',
      ply: 0,
      pieces: [piece('black', 'king'), piece('black', 'rook')],
    });
  });

  it('finds a queen pinned to its king by a cheaper bishop', () => {
    expect(motifOf('7k/8/p4q2/8/8/2P1B3/8/6K1 w - - 0 1', 'e3d4 a6a5 d4f6')).toEqual({
      kind: 'pin',
      ply: 0,
      pieces: [piece('black', 'queen'), piece('black', 'king')],
    });
  });

  it('finds a pinned knight that cannot take the queen', () => {
    expect(motifOf('5k2/p7/5n2/2b5/8/8/8/3Q1R1K w - - 0 1', 'd1h5 a7a6 h5c5')).toEqual({
      kind: 'pin',
      ply: 0,
      pieces: [piece('black', 'knight'), piece('black', 'king')],
    });
  });

  it('finds a rook skewering the king to the rook behind it', () => {
    expect(motifOf('4r3/8/4k3/8/8/8/8/R5K1 w - - 0 1', 'a1e1 e6d6 e1e8')).toEqual({
      kind: 'skewer',
      ply: 0,
      pieces: [piece('black', 'king'), piece('black', 'rook')],
    });
  });

  it('finds a knight check that opens the rook onto the queen', () => {
    expect(motifOf('3q4/6k1/8/8/3N4/8/8/3R2K1 w - - 0 1', 'd4f5 g7g6 d1d8')).toEqual({
      kind: 'discoveredAttack',
      ply: 0,
      pieces: [piece('black', 'queen')],
    });
  });

  it('finds a discovered check by a knight that attacks the queen', () => {
    expect(motifOf('4k3/3q4/8/8/4N3/8/8/4R1K1 w - - 0 1', 'e4c5 e8f8 c5d7')).toEqual({
      kind: 'discoveredCheck',
      ply: 0,
      pieces: [piece('black', 'king'), piece('black', 'queen')],
    });
  });

  it('names a double check before the fork it also is', () => {
    expect(motifOf('4k3/7q/8/8/4N3/8/8/4R1K1 w - - 0 1', 'e4f6 e8d8 f6h7')).toEqual({
      kind: 'doubleCheck',
      ply: 0,
      pieces: [piece('black', 'king'), piece('black', 'queen')],
    });
  });

  it('finds the capture of the knight that defended the bishop', () => {
    expect(motifOf('6k1/1p6/2n5/1B2b3/8/8/8/4R1K1 w - - 0 1', 'b5c6 b7c6 e1e5')).toEqual({
      kind: 'capturingDefender',
      ply: 0,
      pieces: [piece('black', 'knight'), piece('black', 'bishop')],
    });
  });

  it('finds a bishop trapped on a2', () => {
    expect(motifOf('7k/7p/8/8/8/8/bPP5/R1K5 w - - 0 1', 'b2b3 h7h6 a1a2')).toEqual({
      kind: 'trappedPiece',
      ply: 0,
      pieces: [piece('black', 'bishop')],
    });
  });

  it('finds a rook left hanging by the move before', () => {
    const fen = '3r2k1/8/8/8/8/8/8/3Q2K1 b - - 0 1';
    expect(motifOf(fen, 'd8d4 d1d4', opposite(fenTurn(fen)))).toEqual({
      kind: 'hangingPiece',
      ply: 1,
      pieces: [piece('black', 'rook')],
    });
  });

  it('calls nothing hanging without the move that led there', () => {
    expect(motifOf('6k1/8/8/8/3r4/8/8/3Q2K1 w - - 0 1', 'd1d4')).toBeNull();
  });

  it('calls nothing hanging when it takes back a piece of the same worth', () => {
    const fen = '6k1/8/8/3q4/3Q4/8/3R4/6K1 b - - 0 1';
    expect(motifOf(fen, 'd5d4 d2d4', opposite(fenTurn(fen)))).toBeNull();
  });

  it('finds nothing in a line where the winner takes nothing', () => {
    expect(motifOf('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7 e8d7')).toBeNull();
  });
});
