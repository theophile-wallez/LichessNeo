import { isInCheck } from '#shared/chess/index.ts';
import { legalMoves } from '#page/review/chess/moves.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { evaluationLevel } from './trajectory.ts';

// A move that leaves the other side no move and no check: stalemate, a draw.
// A blunder by a side that was winning, a save by one that was losing.

/** Whether the move stalemates: the other side not in check, with no legal move. */
function stalemates({ move, them, after }: FactInput): boolean {
  // An en passant capture, which the board's moves leave out, could be the one move left.
  const passant = move.position.fen.split(' ')[3] ?? '-';
  return passant === '-' && !isInCheck(after, them) && legalMoves(after, them).length === 0;
}

/** The stalemate the move gives, winning side's blunder or a losing side's escape. */
export function stalemateFact(input: FactInput): Fact | null {
  const { move, facts, sign } = input;
  if (move.san.includes('+') || !stalemates(input)) return null;
  return said(oneOf(facts.stalemate(evaluationLevel(move.before) * sign >= 2), move));
}
