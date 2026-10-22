import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { explainLines } from '#page/review/explain/lines.ts';
import { isGameNode } from '#page/review/game/work.ts';
import { threatsReady } from '#page/review/explain/threats.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import type { PanelAction } from './actions.ts';
import { briefMarkup, turningMove } from './brief.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { explainHint } from './explain-hint.ts';
import { movesGraph } from './graph.ts';
import { syncGraphViews } from './graph-views.ts';
import { keyMoments, momentsMarkup, momentsScroll, showMoment } from './moments.ts';
import {
  bubbleTitle,
  evalChip,
  header,
  type IconName,
  shareButton,
  svgIcon,
  thinkingMarkup,
} from './markup.ts';
import { bestShown, lineShown, spokenMove } from './navigation.ts';
import { canRetry, retryOutcome } from './retry.ts';
import { retryBubble } from './retry-bubble.ts';
import { gameTimes, timingAt } from './timing.ts';
import { type CoachComment, commentOn, followComment, timeTag, verdictMarkup } from './verdict.ts';
import { newGameMarkup } from './new-game.ts';
import { fillAroundNav, type NavInput, navState, syncNav } from './nav.ts';

// The move-by-move review: the graph and the game's key moments on top, then
// the coach on the move on the board, the Explain / Best / Next buttons and
// the player's controls. While Explain's best line is on the board, the coach
// still speaks of the move it stands for; while the player retries an error,
// of the moves tried.

interface BubbleInput {
  /** The move on the board, judged, and the coach's comment on it. */
  readonly comment: CoachComment | null;
  /** The engine's best move, played in place of the move on the board. */
  readonly shown: JudgedMove | null;
  /** The buttons under the comment. */
  readonly actions: SafeHtml;
}

function bubbleMarkup(
  session: Session,
  analysis: Analysis,
  { comment, shown, actions }: BubbleInput,
): SafeHtml {
  const { view, live, language } = session;
  const { ui } = language;
  if (!view.review) return bubbleTitle(`${ui.analysing} ${Math.round(view.progress * 100)}%`);
  if (!analysis.path) return briefMarkup(session, view.review);
  if (shown)
    return html`<div class="ln-ext-bubble__row">${classIcon('best')}
          <p class="ln-ext-bubble__title">${verdictTitle('best', analysis.node.san ?? '', language)}</p>
          ${evalChip(shown.before)}</div>`;
  if (!comment) {
    // No verdict yet: the move waits for the engine, as the game's own moves do
    // while the game's analysis runs.
    const error = isGameNode(session.work, analysis.node) ? view.error : live.error;
    return error === null ? thinkingMarkup(ui.thinking) : bubbleTitle(error);
  }
  return verdictMarkup(session, comment, actions);
}

/** What the coach says of the move on the board, when the bubble shows its verdict. */
function movesComment(
  session: Session,
  analysis: Analysis,
  { move, shown }: { readonly move: JudgedMove | null; readonly shown: JudgedMove | null },
): CoachComment | null {
  const { review, explain } = session.view;
  if (!review || shown || !move) return null;
  const hint = explain ? explainHint(session, move) : [];
  // The coach thinks until it knows the threats around the move: then it says all it will.
  if (hint.length === 0 && !threatsReady(session, move)) return null;
  const played = review.moves[move.ply - 1] === move;
  const timing = played ? timingAt(analysis, move.ply) : null;
  const turning = played && turningMove(keyMoments(review))?.ply === move.ply;
  return commentOn(session, { move, gameId: analysis.gameId, hint, timing, turning });
}

/** Under Explain's lines, the button that plays the best one on the board, or goes back. */
function lineButton(session: Session, analysis: Analysis, move: JudgedMove | null): SafeHtml {
  const { view, language } = session;
  const onLine = lineShown(session, analysis) !== null;
  const best = move && explainLines(session, move)?.best;
  if (!view.explain || !best || best.length < 2 || !analysis.canPlayUci) return html``;
  const label = onLine
    ? html`${svgIcon('prev')}${language.ui.back}`
    : html`${svgIcon('play')}${language.ui.lines.show}`;
  return html`<button class="ln-ext-bubble__line" data-ln-ext="line">${label}</button>`;
}

/** Under an error's comment, the button that has the player look for a better move. */
const retryButton = (session: Session, analysis: Analysis, move: JudgedMove | null): SafeHtml =>
  canRetry(move, analysis)
    ? html`<button class="ln-ext-bubble__line ln-ext-bubble__retry" data-ln-ext="retry">${svgIcon('retry')}${session.language.ui.retry.button}</button>`
    : html``;

function actionsMarkup(session: Session, analysis: Analysis, move: JudgedMove | null): SafeHtml {
  const line = lineButton(session, analysis, move);
  const retry = retryButton(session, analysis, move);
  return line.value || retry.value
    ? html`<div class="ln-ext-bubble__actions">${retry}${line}</div>`
    : html``;
}

/** The player's controls, each drawn with the icon of its name. */
const CONTROLS: readonly (PanelAction & IconName)[] = ['first', 'prev', 'play', 'next', 'last'];

function controlsMarkup(playing: boolean): SafeHtml {
  const buttons = CONTROLS.map(action => {
    const icon: IconName = action === 'play' && playing ? 'pause' : action;
    return html`<button class="ln-ext-btn" data-ln-ext="${action}">${svgIcon(icon)}</button>`;
  });
  return html`${buttons}`;
}

// jumpToMain doesn't scroll Lichess's move list: keep the move in view.
function scrollMoveList(): void {
  const box = queryOne(document, 'main.analyse .analyse__moves', HTMLElement);
  const active = box && queryOne(box, 'move.active', HTMLElement);
  if (!box || !active) return;
  const top = active.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  box.scrollTop = top - box.clientHeight / 2 + active.offsetHeight / 2;
}

/** What the panel shows of the move on the board. */
interface Spoken extends NavInput {
  readonly comment: CoachComment | null;
}

/** The coach's mood: the verdict on the board, or on the move tried. */
function coachClass({ move, shown, retried }: Spoken): JudgedMove['moveClass'] | null {
  if (retried) {
    if (retried.kind === 'wrong') return retried.tried.moveClass;
    return retried.kind === 'found' ? 'best' : null;
  }
  return shown ? null : (move?.moveClass ?? null);
}

function coachMarkup(session: Session, analysis: Analysis, spoken: Spoken): SafeHtml {
  const { line, move, shown, comment, retried } = spoken;
  const moveClass = coachClass(spoken);
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass,
    react: takeReaction(session.coach, moveClass, line ? line.path : analysis.path),
    label: session.language.ui.coach,
  });
  const { retry } = session.view;
  const bubble =
    retry && retried
      ? retryBubble(session, retry, retried)
      : bubbleMarkup(session, analysis, {
          comment,
          shown,
          actions: comment ? actionsMarkup(session, analysis, move) : html``,
        });
  const time = comment && !(retry && retried) ? timeTag(session, comment) : '';
  return html`<div class="ln-ext-coach">${avatar}${time}<div class="ln-ext-bubble">${bubble}</div></div>`;
}

export function renderMoves(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const line = lineShown(session, analysis);
  const move = spokenMove(session, analysis);
  const shown = line ? null : bestShown(session, analysis);
  const retried = retryOutcome(session, analysis);
  const comment = retried ? null : movesComment(session, analysis, { move, shown });
  if (comment) followComment(session, comment);
  view.drawing = { path: analysis.path, marks: comment?.drawing ?? [] };
  const spoken = { line, move, shown, comment, retried };
  const moments = momentsMarkup(view.review, language);
  const scrolled = momentsScroll(elements.panel);
  fillAroundNav(
    elements.panel,
    html`${header(language.ui.review, 'summary', language, html`${shareButton(view.sheet, language.ui)}${newGameMarkup(analysis, 'ln-ext-review__new')}`)}
      <div class="ln-ext-review__graph-box"><div class="ln-ext-review__graph-slot"></div><div class="ln-ext-review__views-slot"></div></div>${moments}
      ${coachMarkup(session, analysis, spoken)}`,
    elements.nav,
  );
  syncNav(elements.nav, navState(session, analysis, spoken), language.ui);
  // The graph and its views are kept across renders (its listeners, its first draw, their
  // pick's slide): put them back in their slots.
  queryOne(elements.panel, '.ln-ext-review__graph-slot', HTMLElement)?.replaceWith(
    elements.graphBox,
  );
  queryOne(elements.panel, '.ln-ext-review__views-slot', HTMLElement)?.replaceWith(
    elements.graphViews,
  );
  const hasTimes = gameTimes(analysis).length > 0;
  syncGraphViews(
    elements.graphViews,
    { shown: hasTimes ? view.graph : 'advantage', hasTimes },
    language.ui,
  );
  setHtml(elements.controls, controlsMarkup(view.playing !== null));
  movesGraph(session, analysis, true);
  showMoment(elements.panel, analysis.node.ply, scrolled);
  requestAnimationFrame(scrollMoveList);
}
