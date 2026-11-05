import type { MoveClass } from '#page/review/classes/classes.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import type { Plan } from './idea.ts';
import { planOf, watched } from './plan.ts';
import { type Fact, oneOf, said } from './said.ts';
import { sayOnce } from './told.ts';

// A quiet move that does nothing the coach can name yet, said by the plan of
// the mover's next move along the engine's line: the idea it plays for.

// Only the engine's own move, or one close to it, has the engine's line for its idea.
const SURE: ReadonlySet<MoveClass> = new Set<MoveClass>(['best', 'great', 'excellent']);

// What answers the reply rather than follows the move: no idea of the move's.
const ANSWERS: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>(['saves', 'guards', 'backs']);

// A move close to the engine's, not an answer to a check, which is forced: it
// has no idea of its own.
const hasIdea = (move: MoveVerdict): boolean =>
  SURE.has(move.moveClass) &&
  move.previousPosition.san?.includes('+') !== true &&
  !('mate' in move.after);

export function nextFact({ move, facts, theirs, told }: FactInput): Fact | null {
  const [reply, next] = move.after.line ?? [];
  if (!hasIdea(move) || !reply || !next) return null;
  const [answer, own] = playLine(move.position.fen, [reply, next]);
  if (!answer || !own || answer.san.includes('+') || /[x+]/.test(own.san)) return null;
  const plan = planOf({ ...own, ply: move.position.ply + 2 });
  // The opponent's next moves the reader must watch out for, only.
  if (!plan || ANSWERS.has(plan.kind) || (theirs && !watched(plan))) return null;
  const why = sayOnce(told, plan, next, facts.why(plan, true));
  const token = moveToken(own.san, own.color, { base: 'a', ucis: [reply, next] });
  return why ? said(oneOf(facts.nextUp(token, why), move)) : null;
}
