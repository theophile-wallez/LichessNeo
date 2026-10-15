import { describe, expect, it } from 'vitest';
import { parsePlacement } from '#shared/chess/fen.ts';
import { type Color, opposite } from '#shared/chess/types.ts';
import { LINE, slidesOf, START } from './line.ts';

describe('the preview’s game', () => {
  it('slides a castle’s king, then its rook', () => {
    expect(slidesOf({ from: 'e2', to: 'e4', san: 'e4' })).toEqual([['e2', 'e4']]);
    expect(slidesOf({ from: 'e1', to: 'g1', san: 'O-O', rook: ['h1', 'f1'] })).toEqual([
      ['e1', 'g1'],
      ['h1', 'f1'],
    ]);
  });

  it('moves each side’s own pieces in turn, onto empty squares or the other side’s', () => {
    const pieces = parsePlacement(START);
    let mover: Color = 'white';
    for (const move of LINE) {
      for (const [from, to] of slidesOf(move)) {
        const piece = pieces.get(from);
        expect(piece?.color).toBe(mover);
        expect(pieces.get(to)?.color).not.toBe(mover);
        pieces.delete(from);
        if (piece) pieces.set(to, piece);
      }
      mover = opposite(mover);
    }
    expect(pieces.get('f7')).toEqual({ color: 'black', role: 'king' });
  });
});
