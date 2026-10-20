import {
  attackedSquares,
  attackers,
  type Board,
  opposite,
  parseFen,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import { boardAfter } from './line.ts';
import { isHanging, PIECE_VALUES } from './material.ts';

// A fork: one piece attacking two of the other side's at once, each worth
// more than it, or left undefended, or the king.

const targetValue = (piece: Piece): number =>
  piece.role === 'king' ? 100 : PIECE_VALUES[piece.role];

/** The squares of the pieces the piece on `square` threatens to win: what a fork is made of. */
export function forkTargets(board: Board, square: string): Square[] {
  const from = parseSquare(square);
  const piece = from ? board.get(from) : undefined;
  // A forker taken for less than it's worth forks nothing.
  if (!from || !piece || piece.role === 'king' || isHanging(board, from, piece)) return [];
  const them = opposite(piece.color);
  return attackedSquares(board, from).filter(target => {
    const victim = board.get(target);
    if (!victim || victim.color !== them || victim.role === 'pawn') return false;
    return (
      victim.role === 'king' ||
      PIECE_VALUES[victim.role] > PIECE_VALUES[piece.role] ||
      attackers(board, target, them).length === 0
    );
  });
}

/** The squares of the pieces the piece on `square` forks, the most valuable first. */
export function forkedSquares(board: Board, square: string): Square[] {
  const targets = forkTargets(board, square);
  if (targets.length < 2) return [];
  const value = (target: Square): number => {
    const victim = board.get(target);
    return victim ? targetValue(victim) : 0;
  };
  return targets.toSorted((first, second) => value(second) - value(first));
}

/** The pieces the piece on `square` forks, the most valuable first; none when it forks nothing. */
export const forkedFrom = (board: Board, square: string): Piece[] =>
  forkedSquares(board, square).flatMap(target => board.get(target) ?? []);

/** The pieces the move `uci` forks from `fen`, in the engine's notation. */
export const forkedBy = (fen: string, uci: string): Piece[] =>
  forkedFrom(boardAfter(parseFen(fen).board, uci), uci.slice(2, 4));
