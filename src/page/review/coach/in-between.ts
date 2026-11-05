import { playLine } from '#page/review/chess/played-line.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';

// A move slipped in before taking back: the opponent has just taken, and the
// engine's line takes back on the mover's next move, this one first.

export function inBetweenFact({ move, facts }: FactInput): Fact | null {
  const { previousPosition, position, after, san } = move;
  const square = previousPosition.san?.includes('x') ? previousPosition.uci?.slice(2, 4) : null;
  const [reply, retake] = after.line ?? [];
  if (!square || !reply || !retake || san.includes('x')) return null;
  const [, back] = playLine(position.fen, [reply, retake]);
  if (!back?.captured || retake.slice(2, 4) !== square || reply.slice(2, 4) === square) return null;
  const token = moveToken(back.san, back.color, { base: 'a', ucis: [reply, retake] });
  return said(oneOf(facts.inBetween(token, san.includes('+')), move));
}
