import { parseSquare } from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';

// An error whose piece, after the engine's reply, is best taken straight back
// where it came from: the move did nothing but lose a tempo.

export function goesBackFact({ move, facts, after, reply }: FactInput): Fact | null {
  const [, back] = move.after.line ?? [];
  const from = move.uci.slice(0, 2);
  const to = move.uci.slice(2, 4);
  const square = parseSquare(to);
  const piece = square && after.get(square);
  if (!reply || back?.slice(0, 4) !== `${to}${from}`) return null;
  // A king walks back and forth in an endgame.
  if (!piece || piece.role === 'king') return null;
  return said(oneOf(facts.goesBack(piece, squareToken(from), reply), move));
}
