import { queryAll } from '#shared/dom.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { pumpLines } from '#page/review/explain/lines.ts';
import { pump } from '#page/review/live/queue.ts';
import { type Mode, MODES, type Session } from '#page/review/session.ts';
import { renderBoard } from './board.ts';
import { fitBubble } from './bubble.ts';
import { renderClosed } from './closed-panel.ts';
import { keepAvatar } from './coach-avatar.ts';
import { attach } from './elements.ts';
import { movesGraph } from './graph.ts';
import { renderLive } from './live-panel.ts';
import { renderMoves } from './moves-panel.ts';
import { closeTools, spokenMove, stopPlaying } from './navigation.ts';
import { renderKey } from './render-key.ts';
import { followRetry } from './retry.ts';
import { startStream } from './stream.ts';
import { renderSummary } from './summary-panel.ts';
import { hideTip } from './tooltip.ts';

// The panel, drawn again whenever what it shows changes, and the board's
// marks on every pass.

// Not the comment's move chips: the same move may be named twice.
const KEPT_BUTTONS = 'button[data-cdc]:not([data-cdc="coach"], [data-cdc="chip"])';

const classOf = (element: Element): string => element.getAttribute('class') ?? '';

function drawPanel(session: Session, analysis: Analysis): void {
  const { mode } = session.view;
  if (mode === 'summary') renderSummary(session, analysis);
  else if (mode === 'moves') renderMoves(session, analysis);
  else if (mode === 'live') renderLive(session, analysis);
  else renderClosed(session, analysis);
}

/**
 * Draws the panel again. A button the render leaves as it was stays the same
 * element, so a click spanning a redraw still lands (the summary's Start
 * button redraws with every step of the analysis); a scrolled part stays
 * where it was scrolled to.
 */
function redrawPanel(session: Session, analysis: Analysis): void {
  const { panel } = session.elements;
  const { view } = session;
  const kept = new Map(
    queryAll(panel, KEPT_BUTTONS, Element).map(button => [button.outerHTML, button]),
  );
  const scrolled =
    view.mode === view.drawnMode
      ? queryAll(panel, '*', Element)
          .filter(element => element.scrollTop)
          .map(element => ({ className: classOf(element), top: element.scrollTop }))
      : [];
  view.drawnMode = view.mode;
  drawPanel(session, analysis);
  for (const button of queryAll(panel, KEPT_BUTTONS, Element)) {
    const old = kept.get(button.outerHTML);
    if (old && old !== button) button.replaceWith(old);
  }
  for (const { className, top } of scrolled) {
    const element = queryAll(panel, '*', Element).find(
      candidate => classOf(candidate) === className,
    );
    if (element) element.scrollTop = top;
  }
  keepAvatar(session);
  // Keep the tooltip while the element it points at is still there (a button the render kept).
  if (!session.tipFor?.isConnected) hideTip(session);
  startStream(session);
  fitBubble(panel);
}

/** What runs on its own as the board moves: the engines' lookups, a retry. */
function follow(session: Session, analysis: Analysis): void {
  const { view } = session;
  // Off the game's moves, the review judges them like the free board.
  if (view.mode === 'live' || (view.mode === 'moves' && view.review)) pump(session, analysis);
  const explained = view.mode === 'moves' && view.explain ? spokenMove(session, analysis) : null;
  if (explained) pumpLines(session, analysis, explained);
  if (view.mode === 'moves') followRetry(session, analysis);
  else view.retry = null;
}

export function render(session: Session, force = false): void {
  const analysis = pageAnalysis();
  if (!analysis || !attach(session.elements)) return;
  const { view } = session;
  if (view.mode === 'summary' && analysis.node.ply !== view.summaryPly) {
    setMode(session, 'moves');
    return;
  }
  follow(session, analysis);
  const key = renderKey(session, analysis);
  if (force || key !== view.lastKey) {
    view.lastKey = key;
    redrawPanel(session, analysis);
  }
  if (view.mode === 'moves') movesGraph(session, analysis);
  renderBoard(session, analysis);
}

/** The summary shows until the user moves; then the move-by-move review. */
export function setMode(session: Session, mode: Mode): void {
  const { view } = session;
  const analysis = pageAnalysis();
  view.mode = mode;
  view.summaryPly = analysis?.node.ply;
  if (mode !== 'moves') stopPlaying(session);
  if (mode === 'moves' && analysis) closeTools(analysis);
  const root = document.documentElement;
  for (const each of MODES) root.classList.toggle(`cdc-review-${each}`, each === mode);
  render(session, true);
}
