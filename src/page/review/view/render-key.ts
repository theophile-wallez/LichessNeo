import type { Analysis } from '#page/lichess/analysis.ts';
import { judgeAt, liveDigest } from '#page/review/live/judging.ts';
import type { Session } from '#page/review/session.ts';
import { learnLabel } from './learn.ts';
import { threatsReady } from '#page/review/explain/threats.ts';
import { reviewMove, spokenMove } from './navigation.ts';

// What the panel shows, as one string: it's drawn again only when that
// changes (the render runs every 150 ms, and after each jump of the board).

// The summary and the closed panel show the analysis's progress, which counts
// in steps: each twentieth of the graph known, each percent at full depth. The
// move-by-move review depends only on the move on the board.
function progressKey(session: Session, analysis: Analysis): string {
  const { view } = session;
  if (view.mode === 'moves') return '';
  const { review } = view;
  const known = review ? review.positions.filter(Boolean).length : 0;
  return [
    Math.round(view.progress * 100),
    Math.round((known / analysis.mainline.length) * 20),
    Boolean(review?.complete),
  ].join(',');
}

function spokenReady(session: Session, analysis: Analysis): boolean {
  const move = session.view.mode === 'moves' ? spokenMove(session, analysis) : null;
  return move === null || threatsReady(session, move);
}

export function renderKey(session: Session, analysis: Analysis): string {
  const { view, live } = session;
  const { path } = analysis;
  if (view.mode === 'live')
    return ['live', path, liveDigest(judgeAt(live, analysis, path)), live.error ?? ''].join('|');
  return [
    view.mode,
    path,
    analysis.onMainline,
    analysis.orientation(),
    view.review !== null,
    progressKey(session, analysis),
    // Lichess may draw its analysis request after the summary.
    view.mode === 'summary' && learnLabel(analysis) !== null,
    view.error ?? '',
    view.explain,
    // The lines Explain has in, and the one it played on the board.
    session.lines.found.size,
    view.lineOf?.path ?? '',
    view.playing !== null,
    // Retry's misses, hints and answer.
    view.retry ? `${view.retry.misses}:${view.retry.hints}:${view.retry.revealed}` : '',
    liveDigest(reviewMove(session, analysis)),
    // The comment waits for the threats around its move.
    spokenReady(session, analysis),
    live.error ?? '',
  ].join('|');
}
