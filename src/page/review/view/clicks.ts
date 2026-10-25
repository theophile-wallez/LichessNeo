import { closestTo, queryOne } from '#shared/dom.ts';
import { postCoachPicker } from '#shared/protocol.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { gameIndex } from '#page/review/game/work.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { type PanelAction, PanelActionSchema } from './actions.ts';
import { foldCard } from './card-fold.ts';
import { playChip } from './chips.ts';
import { jumpToClass } from './class-jump.ts';
import { viewOf } from './graph-views.ts';
import { learnFromMistakes } from './learn.ts';
import {
  goTo,
  jump,
  lineShown,
  reviewMove,
  showBest,
  stepPath,
  stopPlaying,
  toggleLine,
  togglePlay,
} from './navigation.ts';
import { isPracticeCommand, type PracticeCommand, practise } from './practice-clicks.ts';
import { askPracticeHint } from './practice.ts';
import { askHint, endRetry, revealRetry, startRetry } from './retry.ts';

// The panel's and the controls' buttons, by their `data-ln-ext` action.

// Explain off leaves the line it played for the move it stands for.
function toggleExplain(session: Session, analysis: Analysis): void {
  const { view } = session;
  const line = lineShown(session, analysis);
  view.explain = !view.explain;
  if (!view.explain && line) goTo(analysis, line.path);
}

function jumpToMoment(session: Session, analysis: Analysis, card: HTMLElement): void {
  const ply = Number(card.dataset.lnExtPly);
  if (Number.isInteger(ply)) jump(session, analysis, ply);
}

type ReviewCommand = Exclude<
  PanelAction,
  | 'coach'
  | 'jump'
  | 'moment'
  | 'learn'
  | 'chip'
  | 'retry'
  | 'hint'
  | 'reveal'
  | 'graph'
  | 'share'
  | 'fold'
  | 'unfold'
  | PracticeCommand
>;

function pickGraphView(session: Session, button: HTMLElement): void {
  const view = viewOf(button);
  if (view) session.view.graph = view;
}

/** Retry's button starts a retry of the move on the board, or ends the one going on. */
function toggleRetry(session: Session, analysis: Analysis): void {
  if (session.view.retry) {
    endRetry(session, analysis, false);
    return;
  }
  const move = lineShown(session, analysis)?.move ?? reviewMove(session, analysis);
  if (move) startRetry(session, analysis, move);
}

/** A tab, or a button that leads to a mode; the tab already picked does nothing. */
function showMode(session: Session, analysis: Analysis, mode: Mode): void {
  if (mode === session.view.mode) return;
  // Starting the review goes to the first move, from the start or off the game.
  if (mode === 'moves' && (gameIndex(session.work, analysis.node) ?? 0) === 0)
    jump(session, analysis, 1);
  session.setMode(mode);
}

function act(session: Session, analysis: Analysis, action: ReviewCommand): void {
  const { view } = session;
  if (action === 'play') togglePlay(session, analysis);
  else if (action === 'explain') toggleExplain(session, analysis);
  else if (action === 'line') toggleLine(session, analysis);
  else if (action === 'rows') view.allRows = !view.allRows;
  else if (action === 'first') jump(session, analysis, 0);
  else if (action === 'last') jump(session, analysis, session.work.nodes.length - 1);
  else if (action === 'prev' || action === 'next') {
    const path = stepPath(session, analysis, action === 'prev' ? -1 : 1);
    if (path !== null) goTo(analysis, path);
  } else if (action === 'best') showBest(session, analysis);
  else showMode(session, analysis, action);
}

interface Clicked {
  readonly action: Exclude<PanelAction, 'coach' | 'fold' | 'unfold'>;
  readonly button: HTMLElement;
}

/** The buttons that carry their own data, Retry's, then the review's commands. */
function dispatch(session: Session, analysis: Analysis, { action, button }: Clicked): void {
  if (action === 'jump') jumpToClass(session, analysis, button);
  else if (action === 'moment') jumpToMoment(session, analysis, button);
  else if (action === 'chip') playChip(session, analysis, button);
  else if (action === 'graph') pickGraphView(session, button);
  else if (action === 'share') session.view.sheet = !session.view.sheet;
  // Lichess's exercise, not the review's: it closes the review.
  else if (action === 'learn') learnFromMistakes(session, analysis);
  else if (action === 'retry') toggleRetry(session, analysis);
  else if (isPracticeCommand(action)) practise(session, analysis, { action, button });
  else if (action === 'hint' && session.view.practice) askPracticeHint(session, analysis);
  else if (action === 'hint') askHint(session);
  else if (action === 'reveal') revealRetry(session, analysis);
  // Retrying, Next goes on with the game.
  else if (action === 'next' && session.view.retry) endRetry(session, analysis, true);
  else act(session, analysis, action);
}

function onClick(session: Session, event: MouseEvent): void {
  const button = closestTo(event.target, '[data-ln-ext]', HTMLElement);
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
  const parsed = PanelActionSchema.safeParse(button.dataset.lnExt);
  if (!parsed.success) return;
  const action = parsed.data;
  // The coaches are picked in the content script, which has their names (content/coach/picker.ts).
  if (action === 'coach') {
    postCoachPicker(session.coach.id);
    return;
  }
  // Only <html>'s class changes: a redraw would replace the card, and its transition with it.
  if (action === 'fold' || action === 'unfold') {
    foldCard(session, action === 'fold');
    return;
  }
  const analysis = pageAnalysis();
  if (!analysis) return;
  const focused = document.activeElement === button;
  if (action !== 'play') stopPlaying(session);
  dispatch(session, analysis, { action, button });
  session.redraw(true);
  if (focused && !button.isConnected) keepFocus(session, action);
}

/** The redraw replaced the button: the focus stays in the review, on the same action if it's there. */
function keepFocus({ elements }: Session, action: PanelAction): void {
  const same = [elements.panel, elements.modes, elements.controls]
    .map(root => queryOne(root, `[data-ln-ext="${action}"]`, HTMLElement))
    .find(element => element !== null);
  (same ?? elements.panel).focus({ preventScroll: true });
}

export function watchClicks(session: Session): void {
  const listener = (event: MouseEvent): void => onClick(session, event);
  for (const root of [session.elements.panel, session.elements.modes, session.elements.controls])
    root.addEventListener('click', listener);
}
