import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { decidedEnding, drawingCorner, keySquaresOf, kingRuleOf } from './endgame-rules.ts';
import { rookRuleOf } from './rook-endings.ts';

const board = (fen: string) => parseFen(fen).board;

describe('keySquaresOf', () => {
  it('puts a pawn’s key squares two ranks ahead, and two rows of them from its fifth', () => {
    expect(keySquaresOf('e2', 'white')).toEqual(['d4', 'e4', 'f4']);
    expect(keySquaresOf('e5', 'white')).toEqual(['d6', 'e6', 'f6', 'd7', 'e7', 'f7']);
    expect(keySquaresOf('e7', 'black')).toEqual(['d5', 'e5', 'f5']);
  });

  it('puts a rook pawn’s beside its queening square, and a seventh-rank pawn’s around it', () => {
    expect(keySquaresOf('a4', 'white')).toEqual(['b7', 'b8']);
    expect(keySquaresOf('e7', 'white')).toEqual(['d7', 'f7', 'd8', 'e8', 'f8']);
  });
});

describe('kingRuleOf', () => {
  it('sees the king step onto a key square of its pawn', () => {
    const after = board('8/8/4k3/8/8/3K4/4P3/8 b - - 0 1');
    expect(kingRuleOf({ after, color: 'white', from: 'c2', to: 'd3' })).toBeNull();
    const reached = board('8/8/4k3/8/3K4/8/4P3/8 b - - 0 1');
    expect(kingRuleOf({ after: reached, color: 'white', from: 'd3', to: 'd4' })).toEqual({
      kind: 'keySquare',
    });
  });

  it('sees the bare king step next to the corner the rook pawn and wrong bishop can’t win', () => {
    const after = board('8/6k1/8/7P/8/8/4B3/4K3 w - - 0 1');
    expect(drawingCorner(after, 'black')).toBe('h8');
    expect(kingRuleOf({ after, color: 'black', from: 'f6', to: 'g7' })).toEqual({
      kind: 'cornerDraw',
    });
  });

  it('finds no drawing corner with the right bishop', () => {
    expect(drawingCorner(board('8/6k1/8/7P/8/8/3B4/4K3 w - - 0 1'), 'black')).toBeNull();
  });
});

describe('decidedEnding', () => {
  it('holds once the king is on a key square, or the other king in the rook pawn’s corner', () => {
    expect(decidedEnding(board('8/8/4k3/8/3K4/8/4P3/8 b - - 0 1'))).toBe(true);
    expect(decidedEnding(board('7k/8/8/7P/8/8/8/4K3 w - - 0 1'))).toBe(true);
    expect(decidedEnding(board('8/8/4k3/8/8/3K4/4P3/8 b - - 0 1'))).toBe(false);
  });
});

describe('rookRuleOf', () => {
  it('sees the rook build the Lucena’s bridge on its fourth rank', () => {
    const after = board('3K4/3P3k/8/8/5R2/8/r7/8 b - - 0 1');
    expect(rookRuleOf({ after, color: 'white', from: 'f1', to: 'f4' })).toEqual({
      kind: 'bridge',
    });
    expect(rookRuleOf({ after, color: 'white', from: 'f5', to: 'f4' })).toEqual({ kind: 'bridge' });
  });

  it('sees the rook take the Vancura’s post beside the rook pawn', () => {
    const after = board('R7/6k1/P4r2/8/1K6/8/8/8 w - - 0 1');
    expect(rookRuleOf({ after, color: 'black', from: 'f2', to: 'f6' })).toEqual({
      kind: 'vancura',
    });
    const near = board('R7/6k1/P1r5/8/1K6/8/8/8 w - - 0 1');
    expect(rookRuleOf({ after: near, color: 'black', from: 'c2', to: 'c6' })).toBeNull();
  });
});
