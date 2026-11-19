import type { Analysis } from '#page/lichess/analysis.ts';
import { isError } from '#page/review/classes/classes.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { Session } from '#page/review/session.ts';
import { loadTheory, theoryAt } from '#page/review/theory/book.ts';
import { askPlayers, playersAt } from '#page/review/theory/players.ts';
import { reviewMove } from './navigation.ts';

// The opening's lookups, made only when a move of the opening is on show, move
// by move, live or in opening practice: the theory's study, read once a page,
// and what Lichess's players play where the move on the board went wrong.

// Past this ply, no move of a game is in the theory's study, nor a classic mistake.
const OPENING_PLIES = 40;

/** The mover's rating, for what its level plays: a game's player's; none on the free board. */
export const moverRating = (
  session: Session,
  analysis: Analysis,
  move: MoveVerdict,
): number | undefined =>
  session.view.mode === 'moves' ? analysis.players()[move.color]?.rating : undefined;

// The free board has no review: its moves are judged as they're played.
const shownMove = (session: Session, analysis: Analysis): MoveVerdict | null =>
  session.view.mode === 'live'
    ? judgeAt(session.live, analysis, analysis.path)
    : reviewMove(session, analysis);

export function lookUpOpening(session: Session, analysis: Analysis): void {
  const { mode } = session.view;
  if (!['moves', 'live', 'openings'].includes(mode) || analysis.node.ply > OPENING_PLIES) return;
  const redraw = (): void => session.redraw(true);
  const { study } = session.language.theory;
  if (study) loadTheory(study, redraw);
  if (mode === 'openings') return;
  const move = shownMove(session, analysis);
  if (!move || !isError(move.moveClass)) return;
  const rating = moverRating(session, analysis, move);
  askPlayers(analysis, move.previousPosition.fen, rating, redraw);
}

/** What the lookups found for the move on show, for the render's key: an answer redraws it. */
export function lookupsKey(session: Session, analysis: Analysis): string {
  const move = shownMove(session, analysis);
  if (!move) return '';
  const theory = theoryAt(move.position.fen) !== null;
  const players =
    playersAt(move.previousPosition.fen, moverRating(session, analysis, move)) !== null;
  return `${String(theory)},${String(players)}`;
}
