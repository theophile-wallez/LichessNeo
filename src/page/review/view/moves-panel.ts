import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { explainLines } from '#page/review/explain/lines.ts';
import type { JudgedMove, LineShown, Session } from '#page/review/session.ts';
import type { PanelAction } from './actions.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { explainHint } from './explain-hint.ts';
import { movesGraph } from './graph.ts';
import { momentsMarkup, momentsScroll, showMoment } from './moments.ts';
import { bubbleTitle, evalChip, header, type IconName, svgIcon } from './markup.ts';
import { bestShown, lineShown, spokenMove, stepPath } from './navigation.ts';
import { type CoachComment, commentOn, followComment, verdictMarkup } from './verdict.ts';

// The move-by-move review: the graph and the game's key moments on top, then
// the coach on the move on the board, the Explain / Best / Next buttons and
// the player's controls. While Explain's best line is on the board, the coach
// still speaks of the move it stands for.

interface BubbleInput {
  /** The move on the board, judged, and the coach's comment on it. */
  readonly comment: CoachComment | null;
  /** The engine's best move, played in place of the move on the board. */
  readonly shown: JudgedMove | null;
}

function bubbleMarkup(
  session: Session,
  analysis: Analysis,
  { comment, shown }: BubbleInput,
): SafeHtml {
  const { view, live, language } = session;
  const { ui } = language;
  if (!view.review) return bubbleTitle(`${ui.analysing} ${Math.round(view.progress * 100)}%`);
  if (shown)
    return html`<div class="cdc-bubble__row">${classIcon('best')}
          <p class="cdc-bubble__title">${verdictTitle('best', analysis.node.san ?? '', language)}</p>
          ${evalChip(shown.before)}</div>`;
  if (!comment) {
    // No verdict yet: the move waits for the engine, as the game's own moves do
    // while the game's analysis runs.
    const error = analysis.onMainline ? view.error : live.error;
    return bubbleTitle(analysis.path ? (error ?? ui.thinking) : ui.intro);
  }
  return verdictMarkup(session, comment);
}

/** What the coach says of the move on the board, when the bubble shows its verdict. */
function movesComment(
  session: Session,
  analysis: Analysis,
  { move, shown }: { readonly move: JudgedMove | null; readonly shown: JudgedMove | null },
): CoachComment | null {
  if (!session.view.review || shown || !move) return null;
  const hint = session.view.explain ? explainHint(session, move) : [];
  return commentOn(session, { move, gameId: analysis.gameId, hint });
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
  return html`<button class="cdc-bubble__line" data-cdc="line">${label}</button>`;
}

/** The player's controls, each drawn with the icon of its name. */
const CONTROLS: readonly (PanelAction & IconName)[] = ['first', 'prev', 'play', 'next', 'last'];

function controlsMarkup(playing: boolean): SafeHtml {
  const buttons = CONTROLS.map(action => {
    const icon: IconName = action === 'play' && playing ? 'pause' : action;
    return html`<button class="cdc-btn" data-cdc="${action}">${svgIcon(icon)}</button>`;
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
}

function coachMarkup(session: Session, analysis: Analysis, spoken: Spoken): SafeHtml {
  const { line, move, shown, comment } = spoken;
  const moveClass = shown ? null : (move?.moveClass ?? null);
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass,
    react: takeReaction(session.coach, moveClass, line ? line.path : analysis.path),
    label: session.language.ui.coach,
  });
  const bubble = bubbleMarkup(session, analysis, { comment, shown });
  const button = comment ? lineButton(session, analysis, move) : '';
  return html`<div class="cdc-coach">${avatar}<div class="cdc-bubble">${bubble}${button}</div></div>`;
}

function navMarkup(session: Session, analysis: Analysis, spoken: Spoken): SafeHtml {
  const { view, language } = session;
  const { ui } = language;
  const { line, move, shown } = spoken;
  const atEnd = !stepPath(session, analysis, 1);
  const canBest = !line && (shown !== null || (move?.best && !GOOD.has(move.moveClass)));
  return html`<div class="cdc-review__nav">
        <button class="cdc-btn${view.explain ? ' cdc-btn--on' : ''}" data-cdc="explain">${svgIcon('bulb')}${ui.explain}</button>
        <button class="cdc-btn${shown ? ' cdc-btn--on' : ''}" data-cdc="best" ${canBest ? '' : 'disabled'}>${svgIcon('star')}${ui.best}</button>
        <button class="cdc-btn cdc-btn--green" data-cdc="next" ${atEnd ? 'disabled' : ''}>${svgIcon('arrow')}${ui.next}</button>
      </div>`;
}

export function renderMoves(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const line = lineShown(session, analysis);
  const move = spokenMove(session, analysis);
  const shown = line ? null : bestShown(session, analysis);
  const comment = movesComment(session, analysis, { move, shown });
  if (comment) followComment(session, comment);
  const spoken = { line, move, shown, comment };
  const moments = view.review ? momentsMarkup(view.review, analysis.node.ply, language) : '';
  const scrolled = momentsScroll(elements.panel);
  setHtml(
    elements.panel,
    html`${header(language.ui.review, 'summary', language)}
      <div class="cdc-review__graph-slot"></div>${moments}
      ${coachMarkup(session, analysis, spoken)}
      ${navMarkup(session, analysis, spoken)}`,
  );
  // The graph is kept across renders (its listeners, its first draw): put it back in its slot.
  queryOne(elements.panel, '.cdc-review__graph-slot', HTMLElement)?.replaceWith(elements.graphBox);
  setHtml(elements.controls, controlsMarkup(view.playing !== null));
  movesGraph(session, analysis, true);
  showMoment(elements.panel, scrolled);
  requestAnimationFrame(scrollMoveList);
}
