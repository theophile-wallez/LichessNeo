import { boardAfter } from '#page/review/chess/line.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import { PUNISHABLE } from '#page/review/judge/judge.ts';
import type { FactInput } from './fact.ts';
import type { Reason } from './idea.ts';
import { bestWins } from './line-facts.ts';
import { planOf } from './plan.ts';
import { type Fact, oneOf, said } from './said.ts';

// The move that was better than the one played, and what it did: the fork it
// made, what it took or won, the plan it followed.

/** What the engine's move did, if the board shows it. */
export function bestReason(input: FactInput): Reason | null {
  const { move, them, before } = input;
  const best = move.best;
  if (!best || !move.bestSan) return null;
  const [first, second] = forkedBy(move.previousPosition.fen, best);
  if (first && second) return { kind: 'fork', first, second };
  const taken = pieceOn(before, best.slice(2, 4));
  if (taken?.color === them) return { kind: 'takes', piece: taken };
  if (move.bestSan.startsWith('O-O')) return { kind: 'castles' };
  // With a mate on the board, the mate is the point, not the plan.
  if ('mate' in move.before) return null;
  const { color, ply, bestSan: san } = move;
  return planOf({ color, ply, uci: best, san, before, after: boardAfter(before, best) });
}

/** What the engine's move did, said after it. */
function whyBest(input: FactInput): string | null {
  const reason = bestReason(input);
  return reason && input.facts.why(reason);
}

/** The better move, a fork or a capture when it was one, else what it did. */
export function bestFact(input: FactInput): Fact | null {
  const { move, facts, them, before, best } = input;
  if (!best || !move.best) return null;
  const [first, second] = forkedBy(move.previousPosition.fen, move.best);
  if (first && second) return said(oneOf(facts.missedFork(best, first, second), move), 'fork');
  const taken = pieceOn(before, move.best.slice(2, 4));
  if (taken?.color === them && taken.role !== 'pawn')
    return said(oneOf(facts.strongerCapture(best, taken), move));
  const why = whyBest(input);
  return said(
    move.moveClass === 'inaccuracy'
      ? oneOf(facts.morePrecise(best, why), move)
      : oneOf(facts.betterMove(best, why), move),
  );
}

/** For a good move, the move a little better, and what it did. */
export function littleBetterFact(input: FactInput): Fact | null {
  const { move, facts, best } = input;
  return best ? said(oneOf(facts.littleMorePrecise(best, whyBest(input)), move)) : null;
}

// The error a miss fails to punish: the opponent's last move, or the one before it, the
// punishment under way (judge.ts). What punished it: its fork, the material it won, else
// what it did.
export function missFact(input: FactInput): Fact {
  const { move, facts, them, best } = input;
  if ((move.previousMove?.loss ?? 0) < PUNISHABLE)
    return said(oneOf(facts.unfinishedPunishment(them, best), move));
  const reason = bestReason(input);
  const material = reason?.kind === 'fork' ? null : bestWins(input);
  const why: Reason | null = material === null ? reason : { kind: 'wins', material };
  const text = oneOf(facts.missedPunishment(them, best, why && facts.why(why)), move);
  return said(text, reason?.kind === 'fork' ? 'fork' : null);
}
