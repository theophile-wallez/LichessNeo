import { PRACTICE_HASH } from '#shared/practice-page.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { ExplorerDbSchema } from '#page/lichess/explorer.ts';
import { linePgn } from '#page/review/practice/openings.ts';
import {
  isGoal,
  isLength,
  keepSettings,
  LevelSchema,
  LinesSchema,
  MovesSchema,
} from '#page/review/practice/settings.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { goTo } from './navigation.ts';
import { followSide, startPractice } from './practice.ts';

// The practice page's choices: the side the user plays, whose games the book
// is, and where the line starts. Its address follows the page, so a reload or
// a shared link comes back to it.

/** The side picked: the board turns to it, as the line will be played from there. */
export function pickSide(session: Session, analysis: Analysis, button: HTMLElement): void {
  const side = button.dataset.lnExtValue;
  if (side !== 'white' && side !== 'black') return;
  session.view.openings.side = side;
  if (analysis.orientation() !== side) analysis.flip();
  followSide(analysis, side);
}

/** Whose games the book plays, in the explorer: the user's own, as the side they play. */
export function pickBook(session: Session, analysis: Analysis, button: HTMLElement): void {
  const db = ExplorerDbSchema.safeParse(button.dataset.lnExtValue);
  if (!db.success) return;
  const side = session.view.practice?.side ?? session.view.openings.side;
  analysis.explorer?.selectBook(db.data, side);
}

/** Practice from the board's position, as the user left it. */
export const startHere = (session: Session, analysis: Analysis): void =>
  startPractice(session, analysis, { side: session.view.openings.side });

/** The board takes `moves`, from the start; none goes back to the start. */
export function loadMoves(analysis: Analysis, moves: readonly string[]): void {
  if (moves.length > 0) analysis.loadLine(linePgn(moves));
  else goTo(analysis, '');
}

/** Practice one of the page's openings, or a position to review: the board takes its line. */
export function startLine(session: Session, analysis: Analysis, button: HTMLElement): void {
  loadMoves(analysis, button.dataset.lnExtMoves?.split(' ').filter(Boolean) ?? []);
  const opening = button.dataset.lnExtName ?? '';
  startPractice(session, analysis, { side: session.view.openings.side, opening });
}

/** Shows the choices of how lines go, or folds them back into their sum. */
export function toggleSettings(session: Session): void {
  const { openings } = session.view;
  openings.settingsOpen = !openings.settingsOpen;
}

/** Whether the book's replies keep to its main lines: from its next reply on. */
export function pickLines(session: Session, button: HTMLElement): void {
  const lines = LinesSchema.safeParse(button.dataset.lnExtValue);
  if (!lines.success) return;
  const { settings } = session.view.openings;
  settings.lines = lines.data;
  keepSettings(settings);
}

/** How many of the user's moves a line goes to: a line already longer ends there. */
export function pickLength(session: Session, button: HTMLElement): void {
  const length = Number(button.dataset.lnExtValue);
  if (!isLength(length)) return;
  const { settings } = session.view.openings;
  settings.length = length;
  keepSettings(settings);
}

/** Whether the user's own move is asked for, where their repertoire has one. */
export function pickMoves(session: Session, button: HTMLElement): void {
  const moves = MovesSchema.safeParse(button.dataset.lnExtValue);
  if (!moves.success) return;
  const { settings } = session.view.openings;
  settings.moves = moves.data;
  keepSettings(settings);
}

/** Lichess's players of every level, or of the user's: the explorer follows (view/practice-level.ts). */
export function pickLevel(session: Session, button: HTMLElement): void {
  const level = LevelSchema.safeParse(button.dataset.lnExtValue);
  if (!level.success) return;
  const { settings } = session.view.openings;
  settings.level = level.data;
  keepSettings(settings);
}

/** The moves a day to aim for. */
export function pickGoal(session: Session, button: HTMLElement): void {
  const goal = Number(button.dataset.lnExtValue);
  if (!isGoal(goal)) return;
  const { settings } = session.view.openings;
  settings.goal = goal;
  keepSettings(settings);
}

/** Keeps the address on the page while it shows, and takes it off after. */
function keepAddress(mode: Mode): void {
  const shown = location.hash === PRACTICE_HASH;
  if (shown === (mode === 'openings')) return;
  const address = mode === 'openings' ? PRACTICE_HASH : location.pathname + location.search;
  history.replaceState(history.state, '', address);
}

/** The analysis board's own title, given back when the page closes. */
let boardTitle: string | null = null;

/** Names the tab after the page while it shows, in Lichess's "Page • lichess.org". */
function keepTitle(session: Session): void {
  if (session.view.mode !== 'openings') {
    if (boardTitle !== null && document.title !== boardTitle) document.title = boardTitle;
    boardTitle = null;
    return;
  }
  boardTitle ??= document.title;
  const site = boardTitle.split(' • ').at(-1) ?? '';
  const title = `${session.language.ui.practice.page.title} • ${site || location.hostname}`;
  if (document.title !== title) document.title = title;
}

/** The address and the tab's title follow the page. */
export function keepPage(session: Session): void {
  keepAddress(session.view.mode);
  keepTitle(session);
}
