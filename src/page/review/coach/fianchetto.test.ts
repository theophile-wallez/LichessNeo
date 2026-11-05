import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { fianchettoOf, guardedHoles, holesBeside } from './fianchetto.ts';

// A fianchetto: the holes its bishop guards beside its pawn, and what the
// bishop meets down the long diagonal.

const BISHOP = { role: 'bishop', color: 'white' } as const;

/** The board after `uci` from `fen`. */
const after = (fen: string, uci: string) => boardAfter(parseFen(fen).board, uci);

describe('holesBeside', () => {
  it('names the squares on both sides of the pawn', () => {
    expect(holesBeside('g3')).toEqual(['f3', 'h3']);
    expect(holesBeside('b6')).toEqual(['a6', 'c6']);
  });

  it('has none for a pawn on the edge', () => {
    expect(holesBeside('a3')).toBeNull();
  });
});

describe('guardedHoles', () => {
  it('sees the holes a castled king keeps behind its bishop', () => {
    const castled = parseFen('6k1/8/8/8/8/6P1/5PBP/6K1 w - - 0 1').board;
    expect(guardedHoles(castled, 'g2', 'white')).toEqual(['f3', 'h3']);
  });

  it('has none with the king elsewhere, or the pawn not on its fianchetto square', () => {
    const home = parseFen('6k1/8/8/8/8/6P1/5PBP/4K3 w - - 0 1').board;
    expect(guardedHoles(home, 'g2', 'white')).toBeNull();
    const pushed = parseFen('6k1/8/8/8/6P1/8/5PBP/6K1 w - - 0 1').board;
    expect(guardedHoles(pushed, 'g2', 'white')).toBeNull();
  });
});

describe('fianchettoOf', () => {
  it('sees the bishop aim at a piece down the long diagonal', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 3';
    expect(fianchettoOf(after(fen, 'f1g2'), 'g2', 'white')).toEqual({
      kind: 'fianchetto',
      piece: BISHOP,
      aim: { kind: 'target', square: 'c6', target: { role: 'knight', color: 'black' } },
    });
  });

  it('sees a held central pawn in the way, and the push that would hit it', () => {
    // d5 is held by e6, and c2-c4 hits it.
    const fen = 'rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/6P1/PPP1PP1P/RNBQKBNR w KQkq - 0 4';
    expect(fianchettoOf(after(fen, 'f1g2'), 'g2', 'white')).toEqual({
      kind: 'fianchetto',
      piece: BISHOP,
      aim: { kind: 'held', square: 'd5', lever: 'c4' },
    });
  });

  it('says nothing of a bishop off the fianchetto square', () => {
    const fen = 'rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/6P1/PPP1PP1P/RNBQKBNR w KQkq - 0 4';
    expect(fianchettoOf(after(fen, 'f1h3'), 'h3', 'white')).toBeNull();
  });
});
