import type { Analysis } from '#page/lichess/analysis.ts';
import { firstChild, parentPath } from '#page/lichess/tree.ts';
import { normalizeUci } from '#page/review/chess/notation.ts';
import { isError } from '#page/review/classes/classes.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { goTo } from './navigation.ts';
import { HINTS } from './retry-hint.ts';

// Retry: back to the position before an error, the player looks for a better
// move on the board. The engine's best is found, and so is any move it no
// longer judges an error; a miss is taken back, for as many tries as the
// player wants, and the answer only comes when they ask for it.

/** How long a miss stays on the board before it's taken back. */
export const MISS_MS = 2000;

export type RetryOutcome =
  /** The position before the error, waiting for a move. */
  | { readonly kind: 'waiting' }
  /** A move tried, its verdict still to come. */
  | { readonly kind: 'checking' }
  /** The game's move, played again. */
  | { readonly kind: 'same' }
  | { readonly kind: 'wrong'; readonly tried: JudgedMove }
  | { readonly kind: 'found'; readonly san: string; readonly best: boolean }
  /** The answer, played after the misses or on request. */
  | { readonly kind: 'revealed'; readonly san: string };

/** An error can be retried: the board can play moves, and the engine has a better one. */
export const canRetry = (move: JudgedMove | null, analysis: Analysis): boolean =>
  move !== null && isError(move.moveClass) && move.best !== null && analysis.canPlayUci;

export function startRetry(session: Session, analysis: Analysis, move: JudgedMove): void {
  const { view } = session;
  const path = view.lineOf?.move === move ? view.lineOf.path : analysis.path;
  view.retry = { path, move, misses: 0, counted: null, hints: 0, revealed: false };
  view.explain = false;
  view.bestOf = null;
  view.lineOf = null;
  goTo(analysis, parentPath(path));
}

/** Asks for the next hint: which piece has to move, then its square. */
export function askHint(session: Session): void {
  const { retry } = session.view;
  if (retry) retry.hints = Math.min(retry.hints + 1, HINTS);
}

/** Plays the engine's best from the position before the error. */
export function revealRetry(session: Session, analysis: Analysis): void {
  const { retry } = session.view;
  if (!retry?.move.best) return;
  retry.revealed = true;
  goTo(analysis, parentPath(retry.path));
  analysis.playUci(retry.move.best);
  analysis.redraw();
}

/** Back to the game: on to the move after the error, or back onto it. */
export function endRetry(session: Session, analysis: Analysis, onward: boolean): void {
  const { retry } = session.view;
  session.view.retry = null;
  if (!retry) return;
  const next = onward ? firstChild(analysis.nodeAtPath(retry.path)) : null;
  goTo(analysis, next ? retry.path + next.id : retry.path);
}

function triedOutcome(session: Session, analysis: Analysis): RetryOutcome {
  const { retry } = session.view;
  const { path, node } = analysis;
  if (!retry || path === retry.path) return { kind: 'same' };
  const before = analysis.nodeAtPath(parentPath(path)).fen;
  const san = node.san ?? '';
  if (normalizeUci(node.uci, before, analysis.chess960) === retry.move.best)
    return retry.revealed ? { kind: 'revealed', san } : { kind: 'found', san, best: true };
  const tried = judgeAt(session.live, analysis, path);
  if (!tried) return { kind: 'checking' };
  // Any move that isn't an error any more answers the error, not the engine's
  // alone: asking again for a move that already put the game right would read
  // as a refusal of what the player found.
  if (!isError(tried.moveClass)) return { kind: 'found', san, best: false };
  return { kind: 'wrong', tried };
}

/** Where the retry stands with the board; null once the board has left it. */
export function retryOutcome(session: Session, analysis: Analysis): RetryOutcome | null {
  const { retry } = session.view;
  if (!retry) return null;
  const from = parentPath(retry.path);
  if (analysis.path === from) return { kind: 'waiting' };
  return parentPath(analysis.path) === from ? triedOutcome(session, analysis) : null;
}

/**
 * Follows the board: a retry the board has left ends, and a miss is taken back
 * after a moment, for another try. The answer is never played in the player's
 * place: the bubble asks them to try again, and only its button gives it.
 */
export function followRetry(session: Session, analysis: Analysis): void {
  const { retry } = session.view;
  if (!retry) return;
  const outcome = retryOutcome(session, analysis);
  if (outcome === null) {
    session.view.retry = null;
    return;
  }
  const { path } = analysis;
  if (outcome.kind !== 'wrong' && outcome.kind !== 'same') {
    retry.counted = null;
    return;
  }
  if (retry.counted === path) return;
  retry.counted = path;
  retry.misses++;
  setTimeout(() => {
    if (session.view.retry !== retry || analysis.path !== path) return;
    goTo(analysis, parentPath(retry.path));
    session.redraw(true);
  }, MISS_MS);
}
