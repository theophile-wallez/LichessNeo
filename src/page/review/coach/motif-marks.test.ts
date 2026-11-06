import { describe, expect, it } from 'vitest';
import { fenTurn } from '#shared/chess/index.ts';
import { lineMotif } from '#page/review/chess/motifs.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { LINES } from '#page/review/fixtures/line-motifs.ts';
import { attractionMarks, motifMarks } from './motif-marks.ts';

const marksOf = (fen: string, line: string) => {
  const plies = playLine(fen, line.split(' '));
  const motif = lineMotif(plies, fenTurn(fen), plies.length);
  return motif && motifMarks(motif, plies);
};

describe('motifMarks', () => {
  it('draws the x-ray’s line through the rook it sees through', () => {
    expect(marksOf(...LINES.xray)).toEqual([
      { kind: 'link', from: 'h6', to: 'c6', tone: 'defense' },
      { kind: 'ring', square: 'd6', tone: 'attack' },
    ]);
  });

  it('draws the defender’s line cut by the knight, and the bishop it left', () => {
    expect(marksOf(...LINES.interference)).toEqual([
      { kind: 'link', from: 'e8', to: 'e4', tone: 'defense' },
      { kind: 'ring', square: 'e6', tone: 'plan' },
      { kind: 'ring', square: 'e4', tone: 'attack' },
    ]);
  });

  it('draws the file the knight cleared, up to the queen’s square', () => {
    expect(marksOf(...LINES.clearance)).toEqual([
      { kind: 'run', from: 'd1', squares: ['d2', 'd3', 'd4', 'd5'], tone: 'plan' },
    ]);
  });

  it('draws the square the king is lured to, and the knight’s move that strikes it', () => {
    const plies = playLine(LINES.attraction[0], LINES.attraction[1].split(' '));
    expect(attractionMarks(plies, 0)).toEqual([
      { kind: 'link', from: 'g5', to: 'f7', tone: 'plan' },
      { kind: 'link', from: 'f7', to: 'h8', tone: 'attack' },
      { kind: 'ring', square: 'h8', tone: 'attack' },
    ]);
  });

  it('draws a fork’s lines to the pieces it hits', () => {
    expect(marksOf('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7 e8d7 c7a8')).toEqual([
      { kind: 'link', from: 'c7', to: 'e8', tone: 'attack' },
      { kind: 'link', from: 'c7', to: 'a8', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'a8', tone: 'attack' },
    ]);
  });
});
