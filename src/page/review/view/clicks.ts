import { closestTo, queryOne } from '#shared/dom.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import type { Session } from '#page/review/session.ts';
import { type PanelAction, PanelActionSchema } from './actions.ts';
import { jumpToClass } from './class-jump.ts';
import { nextCoach } from './coach-avatar.ts';
import { learnFromMistakes } from './learn.ts';
import {
  goTo,
  jump,
  lineShown,
  showBest,
  stepPath,
  stopPlaying,
  toggleLine,
  togglePlay,
} from './navigation.ts';

// The panel's and the controls' buttons, by their `data-cdc` action.

// Explain off leaves the line it played for the move it stands for.
function toggleExplain(session: Session, analysis: Analysis): void {
  const { view } = session;
  const line = lineShown(session, analysis);
  view.explain = !view.explain;
  if (!view.explain && line) goTo(analysis, line.path);
}

function jumpToMoment(analysis: Analysis, card: HTMLElement): void {
  const ply = Number(card.dataset.cdcPly);
  if (Number.isInteger(ply)) jump(analysis, ply);
}

type ReviewCommand = Exclude<PanelAction, 'coach' | 'jump' | 'moment' | 'learn'>;

function act(session: Session, analysis: Analysis, action: ReviewCommand): void {
  const { view } = session;
  if (action === 'play') togglePlay(session, analysis);
  else if (action === 'explain') toggleExplain(session, analysis);
  else if (action === 'line') toggleLine(session, analysis);
  else if (action === 'rows') view.allRows = !view.allRows;
  else if (action === 'first') jump(analysis, 0);
  else if (action === 'last') jump(analysis, analysis.mainline.length - 1);
  else if (action === 'prev' || action === 'next') {
    const path = stepPath(session, analysis, action === 'prev' ? -1 : 1);
    if (path !== null) goTo(analysis, path);
  } else if (action === 'best') showBest(session, analysis);
  else {
    // Starting the review goes to the first move.
    if (action === 'moves' && (!analysis.onMainline || analysis.node.ply === 0)) jump(analysis, 1);
    session.setMode(action);
  }
}

function onClick(session: Session, event: MouseEvent): void {
  const button = closestTo(event.target, '[data-cdc]', HTMLElement);
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
  const parsed = PanelActionSchema.safeParse(button.dataset.cdc);
  if (!parsed.success) return;
  const action = parsed.data;
  if (action === 'coach') {
    nextCoach(session, button);
    // Each coach words the remarks their own way.
    if (session.view.mode === 'moves' || session.view.mode === 'live') session.redraw(true);
    return;
  }
  const analysis = pageAnalysis();
  if (!analysis) return;
  const focused = document.activeElement === button;
  if (action !== 'play') stopPlaying(session);
  if (action === 'jump') jumpToClass(session, analysis, button);
  else if (action === 'moment') jumpToMoment(analysis, button);
  // Lichess's exercise, not the review's: it closes the review.
  else if (action === 'learn') learnFromMistakes(session, analysis);
  else act(session, analysis, action);
  session.redraw(true);
  if (focused && !button.isConnected) keepFocus(session, action);
}

/** The redraw replaced the button: the focus stays in the review, on the same action if it's there. */
function keepFocus({ elements }: Session, action: PanelAction): void {
  const same = [elements.panel, elements.controls]
    .map(root => queryOne(root, `[data-cdc="${action}"]`, HTMLElement))
    .find(element => element !== null);
  (same ?? elements.panel).focus({ preventScroll: true });
}

export function watchClicks(session: Session): void {
  const listener = (event: MouseEvent): void => onClick(session, event);
  session.elements.panel.addEventListener('click', listener);
  session.elements.controls.addEventListener('click', listener);
}
