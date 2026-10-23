import { coachOptions } from '#shared/coach.ts';
import { setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import {
  type Mark,
  type ReviewArrow,
  reviewArrows,
  reviewDrawing,
  setReviewArrows,
  setReviewDrawing,
} from '#page/board/review-arrows.ts';
import { isGameNode, plyIndex } from '#page/review/game/work.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import { type JudgedMove, onFreeBoard, type Session } from '#page/review/session.ts';
import { badgeMarkup, reviewArrowsFor } from './board-badge.ts';
import { barPosition, drawBar } from './eval-bar.ts';
import { liveBadges, reviewBadges, treeMoves } from './move-list.ts';
import { bestShown, reviewMove } from './navigation.ts';
import { practiceBoardMove, practiceMarks } from './practice-bubble.ts';
import { renderOpening } from './opening.ts';

// What the review adds on and around the board: the eval bar, the verdict's
// badge and squares, the arrows, and the move list's badges.

function renderBar(session: Session, analysis: Analysis, shown: JudgedMove | null): void {
  const { view, live } = session;
  const reviewing = view.mode !== 'normal';
  const position = barPosition({
    review: view.review,
    reviewing,
    live: onFreeBoard(view.mode),
    onGame: isGameNode(session.work, analysis.node),
    ply: plyIndex(session.work, analysis.node),
    bestBefore: shown?.before ?? null,
    offGame: live.evals.get(analysis.node.fen),
    last: view.barPosition,
  });
  view.barPosition = reviewing ? position : null;
  document.documentElement.classList.toggle('ln-ext-evalbar-on', position !== null);
  if (position) drawBar(session.elements, position, analysis.orientation());
}

function boardMove(
  session: Session,
  analysis: Analysis,
  shown: JudgedMove | null,
): JudgedMove | null {
  const { mode, retry } = session.view;
  if (mode === 'openings') return practiceBoardMove(session, analysis);
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
// Lichess does on the free board. A retry and practice draw none: they'd give
// the answer away.
function boardArrows(session: Session, analysis: Analysis, move: JudgedMove | null): ReviewArrow[] {
  const { view, live } = session;
  if (view.retry || view.mode === 'openings') return [];
  const offGame =
    view.mode !== 'normal' && view.review !== null && !isGameNode(session.work, analysis.node);
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

// What the comment speaks of, drawn while its move is on the board, unless the
// settings keep the coach's drawings off. A retry and practice put no comment
// there, only the square of a hint asked for, which those settings don't hold back.
function drawnMarks(session: Session, analysis: Analysis): readonly Mark[] {
  const { drawing, mode, retry } = session.view;
  if (mode === 'openings') return practiceMarks(session, analysis);
  if (mode === 'live') return [];
  const shown = mode === 'moves' && drawing.path === analysis.path;
  return shown && (retry !== null || coachOptions().board) ? drawing.marks : [];
}

function renderDrawing(session: Session, analysis: Analysis): void {
  const marks = drawnMarks(session, analysis);
  if (JSON.stringify(marks) !== JSON.stringify(reviewDrawing())) setReviewDrawing(marks);
}

export function renderBoard(session: Session, analysis: Analysis): void {
  const { view, live } = session;
  const shown = onFreeBoard(view.mode) ? null : bestShown(session, analysis);
  renderBar(session, analysis, shown);
  const move = boardMove(session, analysis, shown);
  setData(document.documentElement, 'lnExtCls', move ? move.moveClass : '');
  renderBadge(session, analysis, move);
  renderArrows(session, analysis, move);
  renderDrawing(session, analysis);
  if (onFreeBoard(view.mode)) liveBadges(live, analysis, treeMoves());
  else if (view.review) reviewBadges(live, analysis, view.review);
  if (view.mode === 'live' || view.mode === 'moves') renderOpening(session, analysis);
}
