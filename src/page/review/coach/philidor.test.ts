import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { philidorOf } from './philidor.ts';

// The Philidor defense: the defender's rook on its third rank, its king in
// front of the pawn.

/** Black's rook move from `from` to `to`, from `fen`, read for the Philidor. */
function defenseOf(fen: string, from: Square, to: Square) {
  const after = boardAfter(parseFen(fen).board, `${from}${to}`);
  return philidorOf(after, [from, to], 'black');
}

describe('philidorOf', () => {
  it('sees the rook come to the third rank, the king in front of the pawn', () => {
    expect(defenseOf('4k3/8/8/4P3/3K4/8/8/r6R b - - 0 1', 'a1', 'a6')).toEqual({
      kind: 'philidor',
    });
  });

  it('says nothing once the pawn has reached that rank', () => {
    expect(defenseOf('4k3/8/4P3/8/3K4/8/8/r6R b - - 0 1', 'a1', 'a6')).toBeNull();
  });

  it('says nothing with the king away from the pawn’s file, or the rook on another rank', () => {
    expect(defenseOf('1k6/8/8/4P3/3K4/8/8/r6R b - - 0 1', 'a1', 'a6')).toBeNull();
    expect(defenseOf('4k3/8/8/4P3/3K4/8/8/r6R b - - 0 1', 'a1', 'a7')).toBeNull();
  });
});
