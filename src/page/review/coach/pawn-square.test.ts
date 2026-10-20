import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import {
  entersSquare,
  kingDistance,
  outOfReach,
  outruns,
  pathOf,
  pawnEnding,
  squareMarks,
} from './pawn-square.ts';

const board = (fen: string) => parseFen(fen).board;
const BLACK_KING = { role: 'king', color: 'black' } as const;
const WHITE_KING = { role: 'king', color: 'white' } as const;

// White's a-pawn on a5, three moves from queening, Black's king on f5 or e5.
const FAR = board('8/8/8/P4k2/8/8/8/7K b - - 0 1');
const NEAR = board('8/8/8/P3k3/8/8/8/7K b - - 0 1');
const RACE = { kind: 'outruns', file: 0, king: BLACK_KING, made: false } as const;

describe('the rule of the square’s helpers', () => {
  it('counts a king’s steps between two squares', () => {
    expect(kingDistance('a1', 'h8')).toBe(7);
    expect(kingDistance('e4', 'f6')).toBe(2);
    expect(kingDistance('c3', 'c3')).toBe(0);
  });

  it('tells an ending of kings and pawns', () => {
    expect(pawnEnding(FAR)).toBe(true);
    expect(pawnEnding(board('8/8/8/P4k2/8/8/8/6NK b - - 0 1'))).toBe(false);
  });

  it('lists the squares a pawn has yet to cross, the queening square last', () => {
    expect(pathOf('e2', 'white')).toEqual(['e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
    expect(pathOf('b3', 'black')).toEqual(['b2', 'b1']);
  });
});

describe('outruns', () => {
  it('sees a pawn pushed out of the other king’s square', () => {
    expect(outruns(FAR, 'a5', 'white', false)).toEqual(RACE);
    expect(outruns(NEAR, 'a5', 'white', false)).toBeNull();
  });

  it('counts the other king’s move: from the square’s edge, it still catches the pawn', () => {
    const edge = board('8/8/4k3/P7/8/8/8/7K w - - 0 1');
    expect(outruns(edge, 'a5', 'white', false)).toBeNull();
  });

  it('needs an ending of kings and pawns, a passed pawn and its road clear', () => {
    expect(outruns(board('8/8/8/P4k2/8/8/8/6NK b - - 0 1'), 'a5', 'white', false)).toBeNull();
    // Its own king stands in its way.
    expect(outruns(board('8/K7/8/P4k2/8/8/8/8 b - - 0 1'), 'a5', 'white', false)).toBeNull();
    expect(outruns(board('8/p7/8/P4k2/8/8/8/7K b - - 0 1'), 'a5', 'white', false)).toBeNull();
  });
});

describe('entersSquare', () => {
  it('sees the king step into the square from its edge, just in time', () => {
    const before = board('8/8/4k3/P7/8/8/8/7K b - - 0 1');
    const into = board('8/8/3k4/P7/8/8/8/7K w - - 0 1');
    expect(entersSquare(before, into, 'black')).toEqual({
      kind: 'entersSquare',
      file: 0,
      king: BLACK_KING,
    });
    const aside = board('8/4k3/8/P7/8/8/8/7K w - - 0 1');
    expect(entersSquare(before, aside, 'black')).toBeNull();
  });

  it('says nothing of a king that was inside already', () => {
    const before = board('8/8/3k4/P7/8/8/8/7K b - - 0 1');
    const after = board('8/8/2k5/P7/8/8/8/7K w - - 0 1');
    expect(entersSquare(before, after, 'black')).toBeNull();
  });
});

describe('outOfReach', () => {
  it('reads the race on the file of the reason', () => {
    expect(outOfReach(RACE, FAR, 'black')).toBe(true);
    expect(outOfReach(RACE, NEAR, 'black')).toBe(false);
    expect(outOfReach({ ...RACE, file: 1 }, FAR, 'black')).toBe(false);
  });
});

describe('squareMarks', () => {
  it('draws the square toward the king, and rings the king out of it', () => {
    expect(squareMarks(RACE, FAR, 'black')).toEqual([
      { kind: 'area', from: 'a5', to: 'd8' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });

  it('rings a king in time as a defense', () => {
    expect(squareMarks(RACE, NEAR, 'black')?.at(-1)).toEqual({
      kind: 'ring',
      square: 'e5',
      tone: 'defense',
    });
  });

  it('counts a pawn on its first rank from the next, and a black pawn down the board', () => {
    const start = board('8/8/8/8/8/8/P7/5k1K b - - 0 1');
    expect(squareMarks(RACE, start, 'black')?.[0]).toEqual({ kind: 'area', from: 'a3', to: 'f8' });
    const black = board('K7/8/8/8/7p/8/8/8 w - - 0 1');
    const reason = { kind: 'entersSquare', file: 7, king: WHITE_KING } as const;
    expect(squareMarks(reason, black, 'white')).toEqual([
      { kind: 'area', from: 'h4', to: 'e1' },
      { kind: 'ring', square: 'a8', tone: 'attack' },
    ]);
  });

  it('draws nothing without a race on the file', () => {
    expect(squareMarks({ ...RACE, file: 3 }, FAR, 'black')).toBeNull();
  });
});
