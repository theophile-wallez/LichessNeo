import type { Board } from '#shared/chess/index.ts';
import { playLine } from '#page/review/chess/played-line.ts';
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

// How far the engine's line may go to reach the ending: four moves each.
const ENDING_WITHIN = 8;

/**
 * Whether the engine's move, from a won position with pieces still on, trades
 * into a pawn ending within a few moves, the last capture taken back.
 */
export function leadsToPawnEnding({ move, sign }: Pick<FactInput, 'move' | 'sign'>): boolean {
  const { before, previousPosition } = move;
  if (evaluationLevel(before) * sign < WINNING || !before.line) return false;
  const plies = playLine(previousPosition.fen, before.line.slice(0, ENDING_WITHIN + 1));
  if (!plies[0] || kingsAndPawns(plies[0].before)) return false;
  return plies.some(
    (ply, i) => i < ENDING_WITHIN && kingsAndPawns(ply.after) && !plies[i + 1]?.captured,
  );
}

/** The trade, taken back on `settled`, that leaves a pawn ending: won, or no longer. */
export function pawnEndingFact(input: FactInput, settled: Board, error: boolean): Fact | null {
  const { move, facts, sign } = input;
  if (!kingsAndPawns(settled)) return null;
  const now = evaluationLevel(move.after) * sign;
  if (!error) return now >= WINNING ? said(oneOf(facts.wonPawnEnding, move)) : null;
  const thrown = evaluationLevel(move.before) * sign >= WON_BEFORE && now <= 0;
  return thrown ? said(oneOf(facts.lostPawnEnding(now < 0), move)) : null;
}
