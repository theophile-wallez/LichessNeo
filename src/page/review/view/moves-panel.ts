import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { explainLines } from '#page/review/explain/lines.ts';
import type { JudgedMove, LineShown, Session } from '#page/review/session.ts';
import type { PanelAction } from './actions.ts';
import { briefMarkup } from './brief.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { explainHint } from './explain-hint.ts';
import { movesGraph } from './graph.ts';
import { momentsMarkup, momentsScroll, showMoment } from './moments.ts';
import { bubbleTitle, evalChip, header, type IconName, svgIcon, thinkingMarkup } from './markup.ts';
import { bestShown, lineShown, spokenMove, stepPath } from './navigation.ts';
import { canRetry, type RetryOutcome, retryOutcome } from './retry.ts';
import { retryBubble } from './retry-bubble.ts';
import { timingAt } from './timing.ts';
import { type CoachComment, commentOn, followComment, timeTag, verdictMarkup } from './verdict.ts';
import { newGameMarkup } from './new-game.ts';

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
  if (!analysis.path) return briefMarkup(session, analysis, view.review);
  if (shown)
    return html`<div class="lr-ext-bubble__row">${classIcon('best')}
          <p class="lr-ext-bubble__title">${verdictTitle('best', analysis.node.san ?? '', language)}</p>
          ${evalChip(shown.before)}</div>`;
  if (!comment) {
    // No verdict yet: the move waits for the engine, as the game's own moves do
    // while the game's analysis runs.
    const error = analysis.onMainline ? view.error : live.error;
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
  const timing = review.moves[move.ply - 1] === move ? timingAt(analysis, move.ply) : null;
  return commentOn(session, { move, gameId: analysis.gameId, hint, timing });
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
  return html`<button class="lr-ext-bubble__line" data-lr-ext="line">${label}</button>`;
}

/** Under an error's comment, the button that has the player look for a better move. */
const retryButton = (session: Session, analysis: Analysis, move: JudgedMove | null): SafeHtml =>
  canRetry(move, analysis)
    ? html`<button class="lr-ext-bubble__line lr-ext-bubble__retry" data-lr-ext="retry">${svgIcon('retry')}${session.language.ui.retry.button}</button>`
    : html``;

function actionsMarkup(session: Session, analysis: Analysis, move: JudgedMove | null): SafeHtml {
  const line = lineButton(session, analysis, move);
  const retry = retryButton(session, analysis, move);
  return line.value || retry.value
    ? html`<div class="lr-ext-bubble__actions">${retry}${line}</div>`
    : html``;
}

/** The player's controls, each drawn with the icon of its name. */
const CONTROLS: readonly (PanelAction & IconName)[] = ['first', 'prev', 'play', 'next', 'last'];

function controlsMarkup(playing: boolean): SafeHtml {
  const buttons = CONTROLS.map(action => {
    const icon: IconName = action === 'play' && playing ? 'pause' : action;
    return html`<button class="lr-ext-btn" data-lr-ext="${action}">${svgIcon(icon)}</button>`;
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
interface Spoken {
  /** Explain's best line, when the board is along it. */
  readonly line: LineShown | null;
  readonly move: JudgedMove | null;
  readonly shown: JudgedMove | null;
  readonly comment: CoachComment | null;
  /** Where a retry stands, while the player retries an error. */
  readonly retried: RetryOutcome | null;
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
  return html`<div class="lr-ext-coach">${avatar}${time}<div class="lr-ext-bubble">${bubble}</div></div>`;
}

function navMarkup(session: Session, analysis: Analysis, spoken: Spoken): SafeHtml {
  const { view, language } = session;
  const { ui } = language;
  const { line, move, shown, retried } = spoken;
  // Retrying, Next goes on with the game; Explain and Best would give the answer away.
  const atEnd = !retried && !stepPath(session, analysis, 1);
  const canBest =
    !retried && !line && (shown !== null || (move?.best && !GOOD.has(move.moveClass)));
  return html`<div class="lr-ext-review__nav">
        <button class="lr-ext-btn${view.explain ? ' lr-ext-btn--on' : ''}" data-lr-ext="explain" ${retried ? 'disabled' : ''}>${svgIcon('bulb')}${ui.explain}</button>
        <button class="lr-ext-btn${shown ? ' lr-ext-btn--on' : ''}" data-lr-ext="best" ${canBest ? '' : 'disabled'}>${svgIcon('star')}${ui.best}</button>
        <button class="lr-ext-btn lr-ext-btn--green" data-lr-ext="next" ${atEnd ? 'disabled' : ''}>${svgIcon('arrow')}${ui.next}</button>
      </div>`;
}

export function renderMoves(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const line = lineShown(session, analysis);
  const move = spokenMove(session, analysis);
  const shown = line ? null : bestShown(session, analysis);
  const retried = retryOutcome(session, analysis);
  const comment = retried ? null : movesComment(session, analysis, { move, shown });
  if (comment) followComment(session, comment);
  const spoken = { line, move, shown, comment, retried };
  const moments = view.review ? momentsMarkup(view.review, analysis.node.ply, language) : '';
  const scrolled = momentsScroll(elements.panel);
  setHtml(
    elements.panel,
    html`${header(language.ui.review, 'summary', language, newGameMarkup(analysis, 'lr-ext-review__new'))}
      <div class="lr-ext-review__graph-slot"></div>${moments}
      ${coachMarkup(session, analysis, spoken)}
      ${navMarkup(session, analysis, spoken)}`,
  );
  // The graph is kept across renders (its listeners, its first draw): put it back in its slot.
  queryOne(elements.panel, '.lr-ext-review__graph-slot', HTMLElement)?.replaceWith(
    elements.graphBox,
  );
  setHtml(elements.controls, controlsMarkup(view.playing !== null));
  movesGraph(session, analysis, true);
  showMoment(elements.panel, scrolled);
  requestAnimationFrame(scrollMoveList);
}
