import { queryAll, queryOne } from '#shared/dom.ts';

// A study's chapters, read from Lichess's own list, which it keeps whole while our sheet
// hides it (styles/study-page/sheet.css).

/** A study's page; a broadcast's is one too, with its own side column. */
export const STUDY_PAGE = 'main.analyse:not(.is-relay)';
const LIST = ':scope > .analyse__side > .study__side > .study__chapters > .study-list';

export interface Chapters {
  readonly buttons: readonly HTMLButtonElement[];
  /** The chapter on the board, from 0. */
  readonly index: number;
  readonly title: string;
}

export function readChapters(page: HTMLElement): Chapters | null {
  const buttons = queryAll(page, `${LIST} > button`, HTMLButtonElement);
  const index = buttons.findIndex(button => button.classList.contains('active'));
  const active = buttons[index];
  if (!active) return null;
  const title = queryOne(active, 'h3', HTMLElement)?.textContent.trim() ?? '';
  return { buttons, index, title };
}

/** The study's own name: Lichess titles the page with the study's and the chapter's. */
export function studyName(fullName: string, chapter: string): string {
  const suffix = `: ${chapter}`;
  return chapter && fullName.endsWith(suffix) ? fullName.slice(0, -suffix.length) : fullName;
}

/**
 * Whether a chapter's player bars name its players. Lichess fills them from the chapter's
 * PGN tags, into which an introduction often splits its own name: two parts of the title,
 * and no result.
 */
export function namesPlayers(names: readonly string[], title: string, hasResult: boolean): boolean {
  const named = names.filter(name => name !== '');
  if (named.length === 0) return false;
  return hasResult || !named.every(name => title.includes(name));
}
