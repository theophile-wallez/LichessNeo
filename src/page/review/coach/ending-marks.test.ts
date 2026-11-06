import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { endingMarks } from './ending-marks.ts';

const board = (fen: string) => parseFen(fen).board;

describe('endingMarks', () => {
  it('marks the key squares of the pawn the king reached', () => {
    const after = board('8/8/4k3/8/3K4/8/4P3/8 b - - 0 1');
    expect(endingMarks({ kind: 'keySquare' }, after, 'white', 'd4')).toEqual([
      { kind: 'cells', squares: ['d4', 'e4', 'f4'], tone: 'plan' },
    ]);
  });

  it('marks the corner the bare king draws in', () => {
    const after = board('8/6k1/8/7P/8/8/4B3/4K3 w - - 0 1');
    expect(endingMarks({ kind: 'cornerDraw' }, after, 'black', 'g7')).toEqual([
      { kind: 'cells', squares: ['h8'], tone: 'defense' },
    ]);
  });

  it('runs the Lucena’s bridge from the rook across to the pawn’s file', () => {
    const after = board('3K4/3P3k/8/8/5R2/8/r7/8 b - - 0 1');
    expect(endingMarks({ kind: 'bridge' }, after, 'white', 'f4')).toEqual([
      { kind: 'run', from: 'f4', squares: ['e4', 'd4'], tone: 'plan' },
    ]);
  });

  it('links the Vancura’s rook to the pawn it attacks from the side', () => {
    const after = board('R7/6k1/P4r2/8/1K6/8/8/8 w - - 0 1');
    expect(endingMarks({ kind: 'vancura' }, after, 'black', 'f6')).toEqual([
      { kind: 'link', from: 'f6', to: 'a6', tone: 'attack' },
      { kind: 'ring', square: 'a6', tone: 'attack' },
    ]);
  });

  it('draws the kings of the opposition, and nothing for a reason no rule has', () => {
    const after = board('8/8/8/4k3/8/4K3/3P4/8 b - - 0 1');
    expect(endingMarks({ kind: 'opposition' }, after, 'white', 'e3')).toHaveLength(3);
    expect(endingMarks({ kind: 'seventhRank' }, after, 'white', 'e3')).toBeNull();
  });
});
