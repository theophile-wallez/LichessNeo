import { setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { type ReviewArrow, reviewArrows, setReviewArrows } from '#page/board/review-arrows.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { badgeMarkup, reviewArrowsFor } from './board-badge.ts';
import { barPosition, drawBar } from './eval-bar.ts';
import { liveBadges, reviewBadges, treeMoves } from './move-list.ts';
import { bestShown, reviewMove } from './navigation.ts';
import { renderOpening } from './opening.ts';

// What the review adds on and around the board: the eval bar, the verdict's
// badge and squares, the arrows, and the move list's badges.

function renderBar(session: Session, analysis: Analysis, shown: JudgedMove | null): void {
  const { view, live } = session;
  const reviewing = view.mode !== 'normal';
  const position = barPosition({
    review: view.review,
    reviewing,
    live: view.mode === 'live',
    onMainline: analysis.onMainline,
    ply: analysis.node.ply,
    bestBefore: shown?.before ?? null,
    offGame: live.evals.get(analysis.node.fen),
    last: view.barPosition,
  });
  view.barPosition = reviewing ? position : null;
  document.documentElement.classList.toggle('cdc-evalbar-on', position !== null);
  if (position) drawBar(session.elements, position, analysis.orientation());
}

// Below 1020px Lichess's mobile layout has no room for the panel (review.css
// hides it), and so no way to close the review: the board stays Lichess's.
function boardMove(
  session: Session,
  analysis: Analysis,
  shown: JudgedMove | null,
): JudgedMove | null {
  const { mode, retry } = session.view;
  if (!session.wide.matches) return null;
  if (mode === 'live') return judgeAt(session.live, analysis, analysis.path);
  // Retrying, only the move tried gets a badge.
  if (retry)
    return analysis.path === parentPath(retry.path)
      ? null
      : judgeAt(session.live, analysis, analysis.path);
  if (shown) return { ...shown, moveClass: 'best' };
  return mode === 'normal' ? null : reviewMove(session, analysis);
}

const sameArrows = (drawn: readonly ReviewArrow[], next: readonly ReviewArrow[]): boolean =>
  JSON.stringify(drawn) === JSON.stringify(next);

function renderBadge(session: Session, analysis: Analysis, move: JudgedMove | null): void {
  const { view, elements } = session;
  const { node } = analysis;
  const badge = move
    ? badgeMarkup({
        moveClass: move.moveClass,
        uci: node.uci ?? '',
        san: node.san ?? '',
        orientation: analysis.orientation(),
      })
    : null;
  const markup = badge?.value ?? '';
  if (view.overlay === markup) return;
  view.overlay = markup;
  if (badge) setHtml(elements.overlay, badge);
  else elements.overlay.replaceChildren();
}

// Draws the best move and the reply an error lets in with the board's other
// arrows. Off the game's moves it also draws the engine's move from here, as
// Lichess does on the free board. A retry draws none: they'd give the answer away.
function boardArrows(session: Session, analysis: Analysis, move: JudgedMove | null): ReviewArrow[] {
  const { view, live } = session;
  if (view.retry) return [];
  const offGame =
    session.wide.matches && view.mode !== 'normal' && view.review !== null && !analysis.onMainline;
  const arrows = reviewArrowsFor({
    moveClass: move?.moveClass ?? null,
    best: move?.best ?? null,
    threat: move?.after.best ?? null,
    engine: offGame ? (live.evals.get(analysis.node.fen)?.best ?? null) : null,
  });
  // The comment's move under the pointer (chips.ts).
  return view.hover ? [...arrows, view.hover] : arrows;
}

function renderArrows(session: Session, analysis: Analysis, move: JudgedMove | null): void {
  const arrows = boardArrows(session, analysis, move);
  if (!sameArrows(reviewArrows(), arrows)) setReviewArrows(arrows);
}

export function renderBoard(session: Session, analysis: Analysis): void {
  const { view, live } = session;
  const shown = view.mode === 'live' ? null : bestShown(session, analysis);
  renderBar(session, analysis, shown);
  const move = boardMove(session, analysis, shown);
  setData(document.documentElement, 'cdcCls', move ? move.moveClass : '');
  renderBadge(session, analysis, move);
  renderArrows(session, analysis, move);
  if (view.mode === 'live') {
    liveBadges(live, analysis, treeMoves());
    renderOpening(session, analysis);
  } else if (view.review) reviewBadges(live, analysis, view.review);
}
