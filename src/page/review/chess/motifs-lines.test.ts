import { describe, expect, it } from 'vitest';
import { fenTurn } from '#shared/chess/index.ts';
import { LINES } from '#page/review/fixtures/line-motifs.ts';
import { attractionAt } from './attraction.ts';
import { lineMotif } from './motifs.ts';
import { playLine } from './played-line.ts';

// The motifs that work along a line: an x-ray, a big piece lured, a line cut
// or cleared.

const motifOf = (fen: string, line: string) => {
  const plies = playLine(fen, line.split(' '));
  return lineMotif(plies, fenTurn(fen), plies.length);
};

describe('the motifs along a line', () => {
  it('finds the rook seeing through the rook that takes back', () => {
    expect(motifOf(...LINES.xray)).toMatchObject({ kind: 'xray', ply: 0, at: ['h6', 'd6'] });
  });

  it('sees no x-ray in a rook taking back from another line', () => {
    const fen = '6k1/8/2nr4/1B6/8/8/8/2R3K1 w - - 0 1';
    expect(motifOf(fen, 'b5c6 d6c6 c1c6')?.kind).not.toBe('xray');
  });

  it('finds the knight cutting the rook off the bishop it defends', () => {
    expect(motifOf(...LINES.interference)).toMatchObject({ kind: 'interference', ply: 0 });
  });

  it('finds the knight clearing the file with check for the queen', () => {
    expect(motifOf(...LINES.clearance)).toMatchObject({ kind: 'clearance', ply: 0 });
  });

  it('calls a knight stepping quietly aside no clearance, but the queen’s fork', () => {
    const quiet = 'd5c3 h7h6 d1d5 g8h8 d5a8';
    expect(motifOf(LINES.clearance[0], quiet)).toMatchObject({ kind: 'fork', ply: 2 });
  });

  it('finds the king lured onto the square the knight then checks', () => {
    const plies = playLine(LINES.attraction[0], LINES.attraction[1].split(' '));
    expect(attractionAt(plies, 0)).toEqual({
      piece: { role: 'king', color: 'black' },
      square: 'h8',
    });
    // The fork that follows is what wins, and what the coach names.
    expect(motifOf(...LINES.attraction)).toMatchObject({ kind: 'fork', ply: 2 });
  });

  it('lures no piece when the next move leaves its square alone', () => {
    const plies = playLine(LINES.attraction[0], ['h1h8', 'g8h8', 'g5e4']);
    expect(attractionAt(plies, 0)).toBeNull();
  });
});
