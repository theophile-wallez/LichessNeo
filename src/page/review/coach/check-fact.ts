import type { FactInput } from './fact.ts';
import { drawn, type Fact, oneOf, said } from './said.ts';
import { checkMarks } from './tactic-marks.ts';

// A check, said when nothing else is: one that forces the reply, or one that
// answers a check, drawn.

export function checkFact({ move, facts, them, after }: FactInput): Fact | null {
  if (!move.san.includes('+')) return null;
  if (move.previousPosition.san?.includes('+') !== true)
    return said(oneOf(facts.checkForces(them), move));
  return said(
    oneOf(facts.counterCheck(them), move),
    null,
    drawn('checks', checkMarks(after, them)),
  );
}
