import type { Color, File, Rank, Square } from './types.ts';

const FILES: readonly File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: readonly Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/** The square at a 0-based file and rank, or null off the board. */
export function squareAt(file: number, rank: number): Square | null {
  const fileName = FILES[file];
  const rankName = RANKS[rank];
  return fileName !== undefined && rankName !== undefined ? `${fileName}${rankName}` : null;
}

const fileIndex = (char: string | undefined): number => FILES.findIndex(name => name === char);
const rankIndex = (char: string | undefined): number => RANKS.findIndex(name => name === char);

/** The square named by the first two characters of `text` ("e4", "e2e4"…), or null. */
export function parseSquare(text: string): Square | null {
  return squareAt(fileIndex(text[0]), rankIndex(text[1]));
}

export const isSquare = (text: string): text is Square =>
  text.length === 2 && parseSquare(text) !== null;

/** 0-based [file, rank] of a square. */
export function squareCoords(square: Square): readonly [number, number] {
  return [fileIndex(square[0]), rankIndex(square[1])];
}

/** Where a square is on the board, from its top-left corner, in squares. */
export interface BoardCell {
  readonly column: number;
  readonly row: number;
}

/** A square's cell on a board with `bottom`'s side at the bottom. */
export function cellOf(square: Square, bottom: Color): BoardCell {
  const [file, rank] = squareCoords(square);
  return bottom === 'white' ? { column: file, row: 7 - rank } : { column: 7 - file, row: rank };
}
