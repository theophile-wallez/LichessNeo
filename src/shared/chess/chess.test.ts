import { describe, expect, it } from 'vitest';
import {
  attackers,
  colorLetter,
  COLORS,
  fenTurn,
  isAttacked,
  isInCheck,
  kingSquare,
  parseFen,
  parsePlacement,
  parseSquare,
  PIECE_VALUES,
  ROLE_LETTERS,
  roleOfLetter,
  ROLES,
  sideToMove,
  squareAt,
  squareCoords,
} from './index.ts';

describe('squares', () => {
  it('maps coordinates to names and back', () => {
    expect(squareAt(0, 0)).toBe('a1');
    expect(squareAt(7, 7)).toBe('h8');
    expect(squareAt(8, 0)).toBeNull();
    expect(squareAt(0, -1)).toBeNull();
    expect(squareCoords('e4')).toEqual([4, 3]);
    expect(parseSquare('e2e4')).toBe('e2');
    expect(parseSquare('z9')).toBeNull();
  });
});

describe('parseFen', () => {
  it('reads the placement and the side to move', () => {
    const { board, turn } = parseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    expect(turn).toBe('black');
    expect(board.size).toBe(32);
    expect(board.get('e4')).toEqual({ color: 'white', role: 'pawn' });
    expect(board.get('e2')).toBeUndefined();
    expect(board.get('d8')).toEqual({ color: 'black', role: 'queen' });
  });
});

describe('the side to move', () => {
  it.each([
    ['8/8/8/8/8/8/8/8 w - - 0 1', 'white', 'white'],
    ['8/8/8/8/8/8/8/8 b - - 0 1', 'black', 'black'],
    ['8/8/8/8/8/8/8/8', null, 'white'],
    ['8/8/8/8/8/8/8/8 x', null, 'white'],
  ])('reads %s', (fen, side, turn) => {
    expect(sideToMove(fen)).toBe(side);
    expect(fenTurn(fen)).toBe(turn);
    expect(parseFen(fen).turn).toBe(turn);
  });
});

describe('piece letters', () => {
  it('names the piece images wp, wn… bk', () => {
    const codes = COLORS.flatMap(color =>
      ROLES.map(role => colorLetter(color) + ROLE_LETTERS[role]),
    );
    expect(codes.join(' ')).toBe('wp wn wb wr wq wk bp bn bb br bq bk');
  });

  it('reads role letters in either case', () => {
    expect(roleOfLetter('Q')).toBe('queen');
    expect(roleOfLetter('n')).toBe('knight');
    expect(roleOfLetter('x')).toBeUndefined();
    expect(roleOfLetter('constructor')).toBeUndefined();
    for (const role of ROLES) expect(roleOfLetter(ROLE_LETTERS[role])).toBe(role);
  });

  it('values the pieces, the king at nothing', () => {
    expect(ROLES.map(role => PIECE_VALUES[role])).toEqual([1, 3, 3, 5, 9, 0]);
  });
});

describe('crazyhouse placements', () => {
  it('skips the promoted-piece marker and the pockets', () => {
    const board = parsePlacement('Q~3k3/8/8/8/8/8/8/4K3[Pp]');
    expect(board.get('a8')).toEqual({ color: 'white', role: 'queen' });
    expect(board.get('e8')).toEqual({ color: 'black', role: 'king' });
    expect(board.size).toBe(3);
  });
});

describe('attackers', () => {
  it('finds pawns on the side they capture from', () => {
    const board = parsePlacement('8/8/8/3p4/4P3/8/8/8');
    expect(attackers(board, 'd5', 'white')).toEqual(['pawn']);
    expect(attackers(board, 'e4', 'black')).toEqual(['pawn']);
    expect(attackers(board, 'e5', 'white')).toEqual([]);
  });

  it('stops sliders at the first piece in the way', () => {
    const board = parsePlacement('4k3/8/8/8/4p3/8/8/4R3');
    expect(attackers(board, 'e4', 'white')).toEqual(['rook']);
    expect(isAttacked(board, 'e8', 'white')).toBe(false);
  });

  it('counts knights, kings and queens', () => {
    const board = parsePlacement('8/8/8/8/3N4/8/4K3/Q7');
    expect(attackers(board, 'e6', 'white')).toEqual(['knight']);
    expect(attackers(board, 'd1', 'white').toSorted()).toEqual(['king', 'queen']);
    expect(attackers(board, 'd3', 'white')).toEqual(['king']);
  });
});

describe('checks', () => {
  it('finds the king and whether it is attacked', () => {
    const board = parsePlacement('4k3/8/8/8/8/8/8/4R1K1');
    expect(kingSquare(board, 'black')).toBe('e8');
    expect(isInCheck(board, 'black')).toBe(true);
    expect(isInCheck(board, 'white')).toBe(false);
    expect(isInCheck(parsePlacement('8/8/8/8/8/8/8/4R3'), 'black')).toBe(false);
  });
});
