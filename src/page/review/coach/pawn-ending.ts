import type { Board } from '#shared/chess/index.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { evaluationLevel } from './trajectory.ts';

// A trade into a pawn ending, kings and pawns alone: the simplest win when
// it's won, and a win thrown away when it isn't.

const WINNING = 3;
const WON_BEFORE = 2;

const kingsAndPawns = (board: Board): boolean =>
  [...board.values()].every(({ role }) => role === 'king' || role === 'pawn') &&
  [...board.values()].some(({ role }) => role === 'pawn');

/** The trade, taken back on `settled`, that leaves a pawn ending: won, or no longer. */
export function pawnEndingFact(input: FactInput, settled: Board, error: boolean): Fact | null {
  const { move, facts, sign } = input;
  if (!kingsAndPawns(settled)) return null;
  const now = evaluationLevel(move.after) * sign;
  if (!error) return now >= WINNING ? said(oneOf(facts.wonPawnEnding, move)) : null;
  const thrown = evaluationLevel(move.before) * sign >= WON_BEFORE && now <= 0;
  return thrown ? said(oneOf(facts.lostPawnEnding(now < 0), move)) : null;
}
