import {
  type Board,
  isInCheck,
  parseSquare,
  type Piece,
  PIECE_VALUES,
  type Square,
} from '#shared/chess/index.ts';
import { isHanging, pieceOn } from '#page/review/chess/material.ts';
import { destinations, moved as movedTo } from '#page/review/chess/moves.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';

// A desperado: in the middle of a trade, a piece lost where it stood takes
// something rather than taking back, and is taken there instead. Said of a
// good capture, which the engine approves.

/** Whether the piece on `from` has an empty square to go to where it isn't lost. */
function escapes(board: Board, from: Square, piece: Piece): boolean {
  return destinations(board, from, piece).some(to => {
    const after = movedTo(board, from, to);
    return !board.has(to) && !isInCheck(after, piece.color) && !isHanging(after, to, piece);
  });
}

/** The capture, after the other side's, by a piece that was hanging, taken by the engine's reply. */
export function desperadoFact({ move, facts, before }: FactInput, moved: Piece): Fact | null {
  const from = parseSquare(move.uci.slice(0, 2));
  const square = move.uci.slice(2, 4);
  const taken = pieceOn(before, square);
  // Mid-trade: the other side just took something, and the move doesn't take back.
  const tookLast = move.previousPosition.san?.includes('x') === true;
  const retakes = move.previousPosition.uci?.slice(2, 4) === square;
  // The engine's own choice: with a better move, the piece wasn't lost.
  if (move.best !== move.uci) return null;
  if (!tookLast || retakes || !from || !taken || moved.role === 'pawn' || moved.role === 'king')
    return null;
  // Worth more than its taker, it's a piece won, not a last bite.
  const bite = PIECE_VALUES[taken.role] <= PIECE_VALUES[moved.role];
  // A piece that could step away to safety wasn't lost: the capture is a trade.
  const doomed = bite && isHanging(before, from, moved) && !escapes(before, from, moved);
  const takenThere = move.after.best?.slice(2, 4) === square;
  return doomed && takenThere ? said(oneOf(facts.desperado(moved), move)) : null;
}
