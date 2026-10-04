import type { Analysis } from '#page/lichess/analysis.ts';
import { firstChild, parentPath } from '#page/lichess/tree.ts';
import { normalizeUci } from '#page/review/chess/notation.ts';
import { BEST_PLIES, bestRequest, foundLine } from '#page/review/explain/lines.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { BestShown, JudgedMove, LineShown, Session } from '#page/review/session.ts';

// Moving through the game: the review's buttons, its graph and its player.

const PLAY_STEP_MS = 1200;
const LINE_STEP_MS = 900;

/** The move on the board: the game's, from the review, or one played off it (judged as it comes). */
export function reviewMove(session: Session, analysis: Analysis): JudgedMove | null {
  const { review } = session.view;
  const { path } = analysis;
  if (!review || !path) return null;
  if (analysis.onMainline) return review.moves[analysis.node.ply - 1] ?? null;
  return judgeAt(session.live, analysis, path);
}

/** The engine's best move, when it's on the board in place of the move played (the Best button). */
export function bestShown(session: Session, analysis: Analysis): JudgedMove | null {
  const shown = session.view.bestOf;
  const { path, node } = analysis;
  if (!shown || path === shown.path || path !== parentPath(shown.path) + node.id) return null;
  const before = analysis.nodeAtPath(parentPath(path)).fen;
  return normalizeUci(node.uci, before, analysis.chess960) === shown.move.best ? shown.move : null;
}

/** Explain's best line, while the board is somewhere along it. */
export function lineShown(session: Session, analysis: Analysis): LineShown | null {
  const shown = session.view.lineOf;
  if (!shown) return null;
  const from = parentPath(shown.path);
  if (!analysis.path.startsWith(from)) return null;
  const played: string[] = [];
  for (let at = analysis.path; at.length > from.length; at = parentPath(at)) {
    const before = analysis.nodeAtPath(parentPath(at)).fen;
    played.unshift(normalizeUci(analysis.nodeAtPath(at).uci ?? '', before, analysis.chess960));
  }
  return played.length > 0 && played.every((uci, i) => uci === shown.line[i]) ? shown : null;
}

/** The move the coach speaks of: the one on the board, or the one Explain's line stands for. */
export const spokenMove = (session: Session, analysis: Analysis): JudgedMove | null =>
  lineShown(session, analysis)?.move ?? reviewMove(session, analysis);

export function jump(analysis: Analysis, ply: number): void {
  analysis.jumpToMain(ply);
  analysis.redraw();
}

export function goTo(analysis: Analysis, path: string): void {
  analysis.userJump(path);
  analysis.redraw();
}

/** Plays the engine's best move as a variation in place of the one played, or goes back to that one. */
export function showBest(session: Session, analysis: Analysis): void {
  const { view } = session;
  if (view.bestOf && bestShown(session, analysis)) {
    goTo(analysis, view.bestOf.path);
    return;
  }
  const move = reviewMove(session, analysis);
  if (!move?.best || !analysis.canPlayUci) return;
  const best: BestShown = { path: analysis.path, move };
  view.bestOf = best;
  goTo(analysis, parentPath(analysis.path));
  analysis.playUci(move.best);
  analysis.redraw();
}

/**
 * Plays Explain's best line as a variation in place of the move played, a
 * move at a time on the player's interval, so any click stops it.
 */
function showLine(session: Session, analysis: Analysis): void {
  const { view } = session;
  const move = reviewMove(session, analysis);
  const line = move && foundLine(session, bestRequest(move))?.slice(0, BEST_PLIES);
  if (!move || !line || !analysis.canPlayUci) return;
  view.lineOf = { path: analysis.path, move, line };
  view.bestOf = null;
  goTo(analysis, parentPath(analysis.path));
  let played = 0;
  const step = (): void => {
    const uci = line[played];
    // Done, or the user moved the board elsewhere.
    if (uci === undefined || (played > 0 && !lineShown(session, analysis))) {
      stopPlaying(session);
      session.redraw(true);
      return;
    }
    played++;
    analysis.playUci(uci);
    analysis.redraw();
  };
  view.playing = setInterval(step, LINE_STEP_MS);
  step();
}

/** The bubble's line button: plays the best line, or goes back to the move it stands for. */
export function toggleLine(session: Session, analysis: Analysis): void {
  const shown = lineShown(session, analysis);
  if (shown) goTo(analysis, shown.path);
  else showLine(session, analysis);
}

/**
 * Where the arrows lead along the line on the board: from the best move
 * shown, back to the move it stands for, or on to the one after that.
 */
export function stepPath(session: Session, analysis: Analysis, direction: 1 | -1): string | null {
  const { path } = analysis;
  const shown = session.view.bestOf;
  const line = lineShown(session, analysis);
  const best = shown && bestShown(session, analysis) ? shown.path : path;
  const from = line ? line.path : best;
  if (direction < 0) {
    if (from !== path) return from;
    return from ? parentPath(from) : null;
  }
  const next = firstChild(analysis.nodeAtPath(from));
  return next ? from + next.id : null;
}

export function stopPlaying(session: Session): void {
  const { view } = session;
  if (view.playing !== null) clearInterval(view.playing);
  view.playing = null;
}

/** The play button: a move every 1.2 s along the game, until its end or a move off it. */
export function togglePlay(session: Session, analysis: Analysis): void {
  if (session.view.playing !== null) {
    stopPlaying(session);
    return;
  }
  const step = (): void => {
    const last = analysis.mainline.length - 1;
    if (!analysis.onMainline || analysis.node.ply >= last) {
      stopPlaying(session);
      session.redraw(true);
      return;
    }
    jump(analysis, analysis.node.ply + 1);
  };
  session.view.playing = setInterval(step, PLAY_STEP_MS);
  step();
}

/**
 * Closes Lichess's tools for the move-by-move review, which hides their
 * buttons. Left open, their menu would take the review's move list,
 * "practice with computer" would play moves on its own, and "learn from your
 * mistakes" would hide the engine's moves.
 */
export function closeTools(analysis: Analysis): void {
  analysis.closeActionMenu();
  analysis.stopPractice();
  analysis.setRetro(false);
  analysis.redraw();
}
