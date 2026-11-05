import { describe, expect, it } from 'vitest';
import { parseFen, type Piece } from '#shared/chess/index.ts';
import { blockadeOf } from './blockade.ts';

const BLACK_KNIGHT: Piece = { role: 'knight', color: 'black' };
const boardOf = (fen: string) => parseFen(fen).board;

describe('blockadeOf', () => {
  it('sees a knight in front of an isolated queen’s pawn', () => {
    const iqp = boardOf('r1bq1rk1/pp3ppp/4p3/3n4/3P4/2N5/PP3PPP/R1BQ1RK1 w - - 0 1');
    expect(blockadeOf(iqp, 'd5', BLACK_KNIGHT)).toEqual({
      kind: 'blockades',
      piece: BLACK_KNIGHT,
      pawn: 'd4',
    });
  });

  it('sees a knight in front of a passed pawn', () => {
    const passed = boardOf('6k1/5ppp/3n4/3P4/8/8/5PPP/6K1 w - - 0 1');
    expect(blockadeOf(passed, 'd6', BLACK_KNIGHT)).toEqual({
      kind: 'blockades',
      piece: BLACK_KNIGHT,
      pawn: 'd5',
    });
  });

  it('doesn’t call a pawn with a neighbor, nor a bishop, a blockade', () => {
    // The c3 pawn backs d4 up: it is neither isolated nor passed.
    const chain = boardOf('r1bq1rk1/pp3ppp/4p3/3n4/3P4/2P5/PP3PPP/R1BQ1RK1 w - - 0 1');
    expect(blockadeOf(chain, 'd5', BLACK_KNIGHT)).toBeNull();
    const bishop: Piece = { role: 'bishop', color: 'black' };
    const iqp = boardOf('r1bq1rk1/pp3ppp/4p3/3b4/3P4/2N5/PP3PPP/R1BQ1RK1 w - - 0 1');
    expect(blockadeOf(iqp, 'd5', bishop)).toBeNull();
  });
});
