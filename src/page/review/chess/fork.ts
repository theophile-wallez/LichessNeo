import {
  attackedSquares,
  attackers,
  type Board,
  opposite,
  parseFen,
  parseSquare,
  type Piece,
} from '#shared/chess/index.ts';
import { boardAfter } from './line.ts';
import { isHanging, PIECE_VALUES } from './material.ts';

// A fork: one piece attacking two of the other side's at once, each worth
// more than it, or left undefended, or the king.

const targetValue = (piece: Piece): number =>
  piece.role === 'king' ? 100 : PIECE_VALUES[piece.role];

/** The pieces the piece on `square` forks, the most valuable first; none when it forks nothing. */
function forkedFrom(board: Board, square: string): Piece[] {
  const from = parseSquare(square);
  const piece = from ? board.get(from) : undefined;
  // A forker taken for less than it's worth forks nothing.
  if (!from || !piece || piece.role === 'king' || isHanging(board, from, piece)) return [];
  const them = opposite(piece.color);
  const targets = attackedSquares(board, from).flatMap(target => {
    const victim = board.get(target);
    if (!victim || victim.color !== them || victim.role === 'pawn') return [];
    const worth =
      victim.role === 'king' ||
      PIECE_VALUES[victim.role] > PIECE_VALUES[piece.role] ||
      attackers(board, target, them).length === 0;
    return worth ? [victim] : [];
  });
  if (targets.length < 2) return [];
  return targets.toSorted((first, second) => targetValue(second) - targetValue(first));
}

/** The pieces the move `uci` forks from `fen`, in the engine's notation. */
export const forkedBy = (fen: string, uci: string): Piece[] =>
  forkedFrom(boardAfter(parseFen(fen).board, uci), uci.slice(2, 4));
