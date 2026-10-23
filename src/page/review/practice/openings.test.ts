import { describe, expect, it } from 'vitest';
import { writePlacement } from '#shared/chess/fen.ts';
import { playLine } from '#shared/chess/san.ts';
import { linePgn, OPENINGS, sideToMove } from './openings.ts';
import { OPENINGS_TABLE } from './openings-data.ts';

describe('the openings offered', () => {
  it('read every row of the table', () => {
    expect(OPENINGS).toHaveLength(OPENINGS_TABLE.trim().split('\n').length);
    expect(OPENINGS[0]).toEqual({
      side: 'white',
      eco: 'C50',
      name: 'Italian Game',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      placement: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
      lastMove: 'f1c4',
    });
  });

  it('reach the position and the last move the table gives', () => {
    const wrong = OPENINGS.filter(opening => {
      const line = playLine(opening.moves);
      return (
        !line ||
        writePlacement(line.board) !== opening.placement ||
        line.lastMove !== opening.lastMove
      );
    });
    expect(wrong.map(opening => opening.name)).toEqual([]);
  });

  it('end on a move of the side that practices them', () => {
    const wrong = OPENINGS.filter(opening => sideToMove(opening) === opening.side);
    expect(wrong.map(opening => opening.name)).toEqual([]);
  });

  it('have a name each, both sides some', () => {
    expect(new Set(OPENINGS.map(opening => opening.name)).size).toBe(OPENINGS.length);
    expect(OPENINGS.filter(opening => opening.side === 'black').length).toBeGreaterThan(10);
    expect(OPENINGS.filter(opening => opening.side === 'white').length).toBeGreaterThan(10);
  });
});

describe('a line', () => {
  it('is written as a PGN’s moves', () => {
    expect(linePgn(['e4', 'c5', 'Nf3'])).toBe('1. e4 c5 2. Nf3');
    expect(linePgn([])).toBe('');
  });

  it('leaves the move to the side after its last', () => {
    const line = { name: '', placement: '', lastMove: '' };
    expect(sideToMove({ ...line, moves: [] })).toBe('white');
    expect(sideToMove({ ...line, moves: ['e4'] })).toBe('black');
  });
});
