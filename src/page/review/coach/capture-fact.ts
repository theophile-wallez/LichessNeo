import { attackers, parseSquare, type Piece } from '#shared/chess/index.ts';
import { PIECE_VALUES } from '#page/review/chess/material.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { materialBalance } from './swing.ts';

// What a good capture does: take back, win a piece for free or for less, or
// trade, which a side ahead in material is glad to, pieces rather than pawns.

// Two pawns' worth ahead: enough for trades to help.
const AHEAD = 2;

export function captureFact(input: FactInput, moved: Piece, dest: string): Fact | null {
  const { move, facts, me, them, before } = input;
  const square = parseSquare(dest);
  if (!square) return null;
  // Nothing on the square: en passant.
  const victim: Piece = { role: before.get(square)?.role ?? 'pawn', color: them };
  const previous = move.previousPosition;
  if (previous.san?.includes('x') && previous.uci?.slice(2, 4) === dest)
    return said(oneOf(facts.takesBack(squareToken(dest)), move));
  if (attackers(before, square, them).length === 0)
    return said(oneOf(facts.winsForFree(victim), move), 'hanging');
  const [taken, given] = [PIECE_VALUES[victim.role], PIECE_VALUES[moved.role]];
  if (taken > given)
    return said(oneOf(facts.winsMaterial(victim, { role: moved.role, color: me }), move));
  if (taken < given) return null;
  // Ahead, trade pieces, not pawns.
  const ahead = victim.role !== 'pawn' && materialBalance(before, me) >= AHEAD;
  return said(oneOf(facts.trades(victim, ahead), move));
}
