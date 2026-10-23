import { ROLE_LETTERS, roleOfLetter } from './pieces.ts';
import { squareAt } from './squares.ts';
import type { Color, Piece, Square } from './types.ts';

/** The standard start position's placement field. */
export const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export const START_FEN = `${START_PLACEMENT} w KQkq - 0 1`;

/**
 * The pieces of a FEN's placement field ("rnbqkbnr/pppppppp/8/…"). Crazyhouse
 * adds a `~` after a promoted piece, and its pockets in brackets: both are skipped.
 */
export function parsePlacement(placement: string): Map<Square, Piece> {
  const board = new Map<Square, Piece>();
  for (const [i, row] of placement.split('/').entries()) {
    let file = 0;
    for (const char of row) {
      if (char === '~') continue;
      if (char === '[') break;
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }
      const role = roleOfLetter(char);
      const square = squareAt(file, 7 - i);
      if (role && square)
        board.set(square, { color: char === char.toUpperCase() ? 'white' : 'black', role });
      file++;
    }
  }
  return board;
}

/** A board's placement field, as FEN writes it. */
export function writePlacement(board: ReadonlyMap<Square, Piece>): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const square = squareAt(file, rank);
      const piece = square ? board.get(square) : undefined;
      if (!piece) {
        empty++;
        continue;
      }
      const letter = ROLE_LETTERS[piece.role];
      row += `${empty || ''}${piece.color === 'white' ? letter.toUpperCase() : letter}`;
      empty = 0;
    }
    rows.push(`${row}${empty || ''}`);
  }
  return rows.join('/');
}

export interface Position {
  readonly board: Map<Square, Piece>;
  readonly turn: Color;
}

/** The side to move, or null when the FEN has no such field or an unknown one. */
export function sideToMove(fen: string): Color | null {
  const field = fen.split(' ')[1];
  if (field === 'w') return 'white';
  return field === 'b' ? 'black' : null;
}

/** The side to move, white when the FEN doesn't say. */
export const fenTurn = (fen: string): Color => sideToMove(fen) ?? 'white';

export function parseFen(fen: string): Position {
  const [placement = ''] = fen.split(' ');
  return { board: parsePlacement(placement), turn: fenTurn(fen) };
}
