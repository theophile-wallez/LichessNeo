import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { batteryOf, between, checkers, isDefended, isInBadSpot, pinOf } from './rays.ts';

const board = (fen: string) => parseFen(fen).board;

describe('between', () => {
  it('lists the squares strictly between two on a line', () => {
    expect(between('a1', 'd4')).toEqual(['b2', 'c3']);
    expect(between('e8', 'e5')).toEqual(['e7', 'e6']);
  });

  it('lists none off a line, or between neighbors', () => {
    expect(between('a1', 'b3')).toEqual([]);
    expect(between('a1', 'b2')).toEqual([]);
  });
});

describe('pinOf', () => {
  it('finds a knight pinned to its king by a rook', () => {
    expect(pinOf(board('5k2/8/5n2/8/8/8/8/5R1K b - - 0 1'), 'f6')).toEqual({
      pinner: 'f1',
      behind: 'f8',
    });
  });

  it('finds a pin to the queen only when asked for relative pins', () => {
    const position = board('3q2k1/8/5n2/6B1/8/8/8/6K1 b - - 0 1');
    expect(pinOf(position, 'f6')).toBeNull();
    expect(pinOf(position, 'f6', true)).toEqual({ pinner: 'g5', behind: 'd8' });
  });

  it('finds none when the slider can’t move along the line', () => {
    expect(pinOf(board('5k2/8/5n2/8/8/8/8/5B1K b - - 0 1'), 'f6')).toBeNull();
  });
});

describe('isDefended', () => {
  it('counts a defender behind the attacker', () => {
    expect(isDefended(board('6k1/8/8/3n4/8/3Q3K/8/8 b - - 0 1'), 'd5', 'black')).toBe(false);
    // The rook on d1 takes back on d5 through the square the queen leaves.
    expect(isDefended(board('6k1/8/8/3n4/8/3Q3K/8/3r4 b - - 0 1'), 'd5', 'black')).toBe(true);
  });
});

describe('isInBadSpot', () => {
  it('flags a piece attacked by a cheaper one, even defended', () => {
    expect(isInBadSpot(board('6k1/8/4p3/3n4/2P1P3/8/8/6K1 b - - 0 1'), 'd5')).toBe(true);
    expect(isInBadSpot(board('6k1/8/4p3/3n4/8/8/3R4/6K1 b - - 0 1'), 'd5')).toBe(false);
  });
});

describe('checkers', () => {
  it('lists every piece giving check', () => {
    expect(checkers(board('4k3/8/5N2/8/8/8/8/4R1K1 b - - 0 1'), 'black').toSorted()).toEqual([
      'e1',
      'f6',
    ]);
  });
});

describe('batteryOf', () => {
  it('finds a slider behind a piece of its own, on the other king', () => {
    expect(batteryOf(board('k7/8/8/8/N7/8/8/R3K3 w - - 0 1'), 'a1')).toEqual({
      screen: 'a4',
      target: 'a8',
    });
  });

  it('finds none behind a pawn, which mostly can’t step off the line', () => {
    expect(batteryOf(board('k7/8/8/8/P7/8/8/R3K3 w - - 0 1'), 'a1')).toBeNull();
  });

  it('aims at a queen, but not with a queen, nor at a rook', () => {
    expect(batteryOf(board('4k3/8/8/6q1/8/4N3/8/2B1K3 w - - 0 1'), 'c1')).toEqual({
      screen: 'e3',
      target: 'g5',
    });
    expect(batteryOf(board('4k3/8/8/6q1/8/4N3/8/2Q1K3 w - - 0 1'), 'c1')).toBeNull();
    expect(batteryOf(board('8/8/8/6k1/8/4N3/8/2Q1K3 w - - 0 1'), 'c1')).toEqual({
      screen: 'e3',
      target: 'g5',
    });
    expect(batteryOf(board('4k3/8/8/6r1/8/4N3/8/2B1K3 w - - 0 1'), 'c1')).toBeNull();
  });

  it('finds none from a piece that doesn’t slide', () => {
    expect(batteryOf(board('k7/8/8/8/N7/8/8/K7 w - - 0 1'), 'a1')).toBeNull();
  });
});
