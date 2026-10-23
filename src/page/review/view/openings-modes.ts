import type { Color } from '#shared/chess/types.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import type { Explorer } from '#page/lichess/explorer.ts';
import { chapterOf } from '#page/review/practice/chapters.ts';
import { gameDrills, fetchGames } from '#page/review/practice/games.ts';
import { playerRatings } from '#page/review/practice/player.ts';
import { cardsOf } from '#page/review/practice/rounds.ts';
import { fetchTraps } from '#page/review/practice/traps.ts';
import type { Session } from '#page/review/session.ts';
import { startQuiz } from './openings-quiz.ts';
import { stopPractice } from './practice.ts';
import { startBlitz, startReviewRound, startRound } from './practice-rounds.ts';
import { loadStudies } from './openings-repertoire-actions.ts';

// The practice page's modes, from their tiles: the daily review, the
// challenge and the quiz start at once; traps, the user's games and their
// repertoire open a page of their own first.

/** Back to the page's home, from a page of its own, a line or the quiz. */
export function goHome(session: Session, analysis: Analysis): void {
  const { openings } = session.view;
  if (session.view.practice) stopPractice(session, analysis);
  openings.quiz = null;
  openings.traps = null;
  openings.view = 'home';
}

export function openMode(session: Session, analysis: Analysis, mode: string): void {
  const { openings } = session.view;
  if (mode === 'review') startReviewRound(session, analysis);
  else if (mode === 'blitz') startBlitz(session, analysis);
  else if (mode === 'quiz') startQuiz(session, analysis);
  else if (mode === 'traps') openings.view = 'traps';
  else if (mode === 'games') openGames(session, analysis);
  else if (mode === 'repertoire') {
    openings.view = 'repertoire';
    if (openings.tab === 'studies') loadStudies(session);
  }
}

/** The user's games, read for their habits once a visit, or again after a failure. */
function openGames(session: Session, analysis: Analysis): void {
  const { openings } = session.view;
  openings.view = 'games';
  const user = document.body.dataset.user;
  const { explorer } = analysis;
  if (!user || !explorer || openings.games.state === 'loading' || openings.games.state === 'done')
    return;
  openings.games = { state: 'loading' };
  void readGames(session, { explorer, user });
}

async function readGames(
  session: Session,
  { explorer, user }: { explorer: Explorer; user: string },
): Promise<void> {
  const { openings } = session.view;
  try {
    const drills = await gameDrills(explorer, { games: await fetchGames(user), user });
    openings.games = { state: 'done', value: drills };
  } catch {
    openings.games = { state: 'failed' };
  }
  session.redraw(true);
}

/** Drills of the user's games, from the one picked on. */
export function startDrills(session: Session, analysis: Analysis, from: number): void {
  const { games } = session.view.openings;
  if (games.state !== 'done' || games.value.length === 0) return;
  const round = { kind: 'games' as const, ...cardsOf(games.value) };
  round.index = Math.min(from, games.value.length - 1);
  startRound(session, analysis, round);
}

/** An opening's traps, fetched for the side the user plays at their level, then played. */
export function startTraps(session: Session, analysis: Analysis, name: string): void {
  const { openings } = session.view;
  const opening = chapterOf(name);
  const { side } = openings;
  openings.traps = { opening, state: 'loading' };
  void readTraps(session, analysis, { opening, side });
}

async function readTraps(
  session: Session,
  analysis: Analysis,
  { opening, side }: { opening: string; side: Color },
): Promise<void> {
  const { openings } = session.view;
  const rating = playerRatings(() => {})?.puzzles ?? null;
  try {
    const traps = await fetchTraps(opening, { side, rating });
    if (openings.traps?.opening !== opening) return;
    if (traps.length === 0) openings.traps = { opening, state: 'none' };
    else {
      openings.traps = null;
      startRound(session, analysis, { kind: 'trap', side, opening, ...cardsOf(traps) });
    }
  } catch {
    if (openings.traps?.opening === opening) openings.traps = { opening, state: 'failed' };
  }
  session.redraw(true);
}
