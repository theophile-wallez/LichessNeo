import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { discoveryMarks, discoveryOf } from './discovery.ts';

// Qd2-b2 lines the queen up behind the knight on d4, on the king on g7.
const BEFORE = parseFen('r3qr2/1p3bkp/2n3p1/3p2P1/3N3P/1P1B4/N2Q1P2/1K1R3R w - - 1 26').board;
const AFTER = boardAfter(BEFORE, 'd2b2');

describe('discoveryOf', () => {
  it('sees the slider line up behind a piece of its own on the king', () => {
    expect(discoveryOf(BEFORE, AFTER, ['d2', 'b2'])).toEqual({
      kind: 'discovery',
      slider: { role: 'queen', color: 'white' },
      screen: { role: 'knight', color: 'white' },
      target: { role: 'king', color: 'black' },
    });
  });

  it('says nothing of a battery that was there already', () => {
    // Back along the same diagonal: the knight still stands in front of the queen.
    expect(discoveryOf(AFTER, boardAfter(AFTER, 'b2a1'), ['b2', 'a1'])).toBeNull();
  });

  it('says nothing of a move that lines nothing up', () => {
    expect(discoveryOf(BEFORE, boardAfter(BEFORE, 'd2e2'), ['d2', 'e2'])).toBeNull();
  });
});

describe('discoveryMarks', () => {
  it('draws the slider’s line to the target, the piece in front ringed', () => {
    expect(discoveryMarks(AFTER, 'b2', AFTER)).toEqual([
      { kind: 'link', from: 'b2', to: 'g7', tone: 'attack' },
      { kind: 'ring', square: 'd4', tone: 'plan' },
      { kind: 'ring', square: 'g7', tone: 'attack' },
    ]);
  });

  it('leaves out the ring of a piece that isn’t on the board shown', () => {
    const moved = boardAfter(AFTER, 'd4f5');
    expect(discoveryMarks(AFTER, 'b2', moved)).toEqual([
      { kind: 'link', from: 'b2', to: 'g7', tone: 'attack' },
      { kind: 'ring', square: 'g7', tone: 'attack' },
    ]);
  });

  it('draws nothing without a battery', () => {
    expect(discoveryMarks(BEFORE, 'd2', BEFORE)).toBeNull();
  });
});
