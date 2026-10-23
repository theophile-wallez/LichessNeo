import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { ExplorerDbSchema } from '#page/lichess/explorer.ts';
import {
  AUTO_LENGTH,
  GOALS,
  LENGTHS,
  LevelSchema,
  LinesSchema,
  MovesSchema,
} from '#page/review/practice/settings.ts';
import { syncState } from '#page/review/practice/sync.ts';
import type { Session } from '#page/review/session.ts';
import { CHEVRON_ICON, svgIcon } from './markup.ts';
import { choiceBar, slot } from './openings-kept.ts';
import { syncRow } from './openings-sync.ts';
import { levelRating } from './practice-level.ts';

// How practice's lines go: whose games the book is, and of which level, whether
// it keeps to its main lines, how many of the user's moves a line goes to,
// whether their own repertoire's move is asked for, the daily goal, and
// whether the user's Lichess studies keep their progress. Folded into a line
// that sums them up, which opens on the choices.

/** Whose games the book is, as the explorer's tabs pick them. */
export function bookBar(session: Session, analysis: Analysis): HTMLElement {
  const { page } = session.language.ui.practice;
  const options = ExplorerDbSchema.options.map(value => ({
    value,
    label: html`${page.books[value]}`,
  }));
  const picked = analysis.explorer?.source?.db ?? null;
  return choiceBar(session, 'practice-book', { options, picked });
}

/** Lichess's players of every level, or of the user's. */
export function levelBar(session: Session): HTMLElement {
  const { home } = session.language.ui.practice.page;
  const rating = levelRating(session);
  const options = LevelSchema.options.map(value => ({
    value,
    label: html`${value === 'mine' && rating ? home.levelMine(rating) : home.levels[value]}`,
  }));
  return choiceBar(session, 'practice-level', {
    options,
    picked: session.view.openings.settings.level,
  });
}

/** Whether the book's replies keep to its main lines. */
export function linesBar(session: Session): HTMLElement {
  const { page } = session.language.ui.practice;
  const options = LinesSchema.options.map(value => ({ value, label: html`${page.lines[value]}` }));
  const picked = session.view.openings.settings.lines;
  return choiceBar(session, 'practice-lines', { options, picked });
}

/** How many of the user's moves a line goes to, or a length that grows. */
export function lengthBar(session: Session): HTMLElement {
  const { page } = session.language.ui.practice;
  const options = LENGTHS.map(moves => ({
    value: String(moves),
    label: html`${moves === AUTO_LENGTH ? page.home.autoLength : page.length(moves)}`,
  }));
  const picked = String(session.view.openings.settings.length);
  return choiceBar(session, 'practice-length', { options, picked });
}

/** Whether the user's own move is asked for where their repertoire has one. */
export function movesBar(session: Session): HTMLElement {
  const { home } = session.language.ui.practice.page;
  const options = MovesSchema.options.map(value => ({ value, label: html`${home.moves[value]}` }));
  return choiceBar(session, 'practice-moves', {
    options,
    picked: session.view.openings.settings.moves,
  });
}

/** The moves a day to aim for. */
export function goalBar(session: Session): HTMLElement {
  const { home } = session.language.ui.practice.page;
  const options = GOALS.map(moves => ({ value: String(moves), label: html`${home.goal(moves)}` }));
  const picked = String(session.view.openings.settings.goal);
  return choiceBar(session, 'practice-goal', { options, picked });
}

/** How lines go, summed up on a line that opens on its choices, as the setup and practice show it. */
export function settingsPanel(session: Session, analysis: Analysis): SafeHtml {
  const { page } = session.language.ui.practice;
  const { settings, settingsOpen } = session.view.openings;
  const db = analysis.explorer?.source?.db ?? 'masters';
  const length =
    settings.length === AUTO_LENGTH ? page.home.autoSum : page.movesSum(settings.length);
  const sum = [
    page.books[db],
    ...(db === 'lichess' ? [page.home.levels[settings.level]] : []),
    page.lines[settings.lines],
    length,
    ...(syncState() ? [page.syncSum] : []),
  ].join(' · ');
  const toggle = html`<button class="ln-ext-openings__settings" data-ln-ext="practice-settings" aria-expanded="${String(settingsOpen)}">${svgIcon('settings')}<span>${sum}</span>${CHEVRON_ICON}</button>`;
  if (!settingsOpen) return toggle;
  const level = db === 'lichess' ? choiceRow(page.home.levelLabel, 'level') : '';
  return html`${toggle}${choiceRow(page.bookLabel, 'book')}${level}${choiceRow(page.linesLabel, 'lines')}${choiceRow(page.lengthLabel, 'length')}${choiceRow(page.home.movesLabel, 'moves')}${choiceRow(page.home.goalLabel, 'goal')}${syncRow(session)}`;
}

/** A row of choices, kept as `name` (view/openings-kept.ts). */
export const choiceRow = (label: string, name: string, inline = false): SafeHtml =>
  html`<div class="ln-ext-openings__choice${inline ? ' ln-ext-openings__choice--inline' : ''}">${label ? html`<span class="ln-ext-openings__label">${label}</span>` : ''}${slot(name)}</div>`;
