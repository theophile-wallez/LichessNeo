import type { Analysis } from '#page/lichess/analysis.ts';
import type { Session } from '#page/review/session.ts';
import type { PanelAction } from './actions.ts';
import {
  pickBook,
  pickGoal,
  pickLength,
  pickLevel,
  pickLines,
  pickMoves,
  pickSide,
  startHere,
  startLine,
  toggleSettings,
} from './openings-actions.ts';
import { goHome, openMode, startDrills, startTraps } from './openings-modes.ts';
import { answerQuiz, nextQuestion } from './openings-quiz.ts';
import {
  pickTab,
  practiceRow,
  pruneBranch,
  starLine,
  startChapter,
  toggleRow,
  toggleStudy,
} from './openings-repertoire-actions.ts';
import { turnSyncOff, turnSyncOn } from './openings-sync.ts';
import {
  playComputer,
  practiceAgain,
  revealPracticeMove,
  stopPractice,
  switchSide,
  takeBack,
} from './practice.ts';
import { adoptMove } from './practice-progress.ts';
import { nextCard } from './practice-rounds.ts';

// The practice page's buttons (view/openings-page.ts), by their action.

export type PracticeCommand = Extract<PanelAction, `practice${string}`>;

export const isPracticeCommand = (action: PanelAction): action is PracticeCommand =>
  action.startsWith('practice');

type Handler = (session: Session, analysis: Analysis, button: HTMLElement) => void;

/** A handler that needs the button alone. */
const withButton =
  (handle: (session: Session, button: HTMLElement) => void): Handler =>
  (session, _analysis, button) =>
    handle(session, button);

const mode =
  (name: string): Handler =>
  (session, analysis) =>
    openMode(session, analysis, name);

const HANDLERS: Readonly<Record<PracticeCommand, Handler>> = {
  'practice-start': startHere,
  'practice-line': startLine,
  'practice-color': pickSide,
  'practice-book': pickBook,
  'practice-side': switchSide,
  'practice-back': takeBack,
  'practice-reveal': revealPracticeMove,
  'practice-lines': withButton(pickLines),
  'practice-length': withButton(pickLength),
  'practice-moves': withButton(pickMoves),
  'practice-level': withButton(pickLevel),
  'practice-goal': withButton(pickGoal),
  'practice-settings': session => toggleSettings(session),
  'practice-sync': session => turnSyncOn(session),
  'practice-unsync': session => turnSyncOff(session),
  'practice-again': practiceAgain,
  'practice-computer': playComputer,
  'practice-stop': stopPractice,
  'practice-mode-review': mode('review'),
  'practice-mode-traps': mode('traps'),
  'practice-mode-blitz': mode('blitz'),
  'practice-mode-quiz': mode('quiz'),
  'practice-mode-games': mode('games'),
  'practice-mode-repertoire': mode('repertoire'),
  'practice-home': goHome,
  'practice-next': nextCard,
  'practice-adopt': (session, analysis) => adoptMove(session, analysis, analysis.path),
  'practice-trap': (session, analysis, button) =>
    startTraps(session, analysis, button.dataset.lnExtName ?? ''),
  'practice-drill': (session, analysis, button) =>
    startDrills(session, analysis, Number(button.dataset.lnExtValue)),
  'practice-drills': (session, analysis) => startDrills(session, analysis, 0),
  'practice-tab': withButton(pickTab),
  'practice-tree-toggle': withButton(toggleRow),
  'practice-tree-line': practiceRow,
  'practice-star': withButton(starLine),
  'practice-prune': withButton(pruneBranch),
  'practice-study': withButton(toggleStudy),
  'practice-chapter': startChapter,
  'practice-quiz': answerQuiz,
  'practice-quiz-next': nextQuestion,
};

export function practise(
  session: Session,
  analysis: Analysis,
  { action, button }: { readonly action: PracticeCommand; readonly button: HTMLElement },
): void {
  HANDLERS[action](session, analysis, button);
}
