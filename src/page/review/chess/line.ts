import { type Board, type Color, fenTurn, opposite, parseFen } from '#shared/chess/index.ts';
import { boardAfter } from './board-after.ts';
import { sanAfter } from './notation.ts';

export { boardAfter } from './board-after.ts';

// An engine line, played out from its position so each move can be written
// as the review writes moves, with its number.

export interface LineMove {
  readonly san: string;
  readonly color: Color;
  /** The move's number, as a FEN counts them. */
  readonly number: number;
}

/** The moves of `line`, played from `fen`. */
export function lineMoves(fen: string, line: readonly string[]): LineMove[] {
  let board: Board = parseFen(fen).board;
  let color = fenTurn(fen);
  let number = Number(fen.split(' ')[5]) || 1;
  const moves: LineMove[] = [];
  for (const uci of line) {
    moves.push({ san: sanAfter(board, uci), color, number });
    board = boardAfter(board, uci);
    if (color === 'black') number++;
    color = opposite(color);
  }
  return moves;
}
