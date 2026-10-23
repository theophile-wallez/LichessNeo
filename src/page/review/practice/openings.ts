import type { Color } from '#shared/chess/types.ts';
import { OPENINGS_TABLE } from './openings-data.ts';

// The openings the practice page offers to start from: the best known lines
// of each side, from Lichess's own list, and those its search finds.

/** A line of moves from the start, named, and the position it reaches. */
export interface OpeningLine {
  readonly name: string;
  /** Its moves, in SAN. */
  readonly moves: readonly string[];
  /** The position it reaches: a FEN's placement. */
  readonly placement: string;
  /** Its last move, in UCI. */
  readonly lastMove: string;
}

export interface Opening extends OpeningLine {
  /** The side that chose it: the one that practices it. */
  readonly side: Color;
  readonly eco: string;
}

function parseRow(row: string): Opening[] {
  const [side, eco = '', name = '', moves = '', placement = '', lastMove = ''] = row.split('|');
  if (side !== 'white' && side !== 'black') return [];
  return [{ side, eco, name, moves: moves.split(' '), placement, lastMove }];
}

export const OPENINGS: readonly Opening[] = OPENINGS_TABLE.trim().split('\n').flatMap(parseRow);

/** The line as a PGN's moves: "1. e4 c5 2. Nf3". */
export const linePgn = (moves: readonly string[]): string =>
  moves.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ');

/** The side whose turn it is after the line. */
export const sideToMove = (line: OpeningLine): Color =>
  line.moves.length % 2 === 0 ? 'white' : 'black';
