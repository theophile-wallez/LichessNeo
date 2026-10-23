import type { Analysis } from '#page/lichess/analysis.ts';
import { treeBook } from '#page/review/practice/book-tree.ts';
import { toggleFavorite } from '#page/review/practice/progress.ts';
import { withEntries } from '#page/review/practice/chapters.ts';
import { keepRepertoire, nameAlong, storedRepertoire } from '#page/review/practice/repertoire.ts';
import { branchEntries, withoutBranch } from '#page/review/practice/repertoire-tree.ts';
import { chaptersOf } from '#page/review/practice/studies.ts';
import { listStudies } from '#page/review/practice/study-api.ts';
import { STUDY_NAMES } from '#page/review/practice/sync-connect.ts';
import { notePruned } from '#page/review/practice/sync.ts';
import type { Session } from '#page/review/session.ts';
import { loadMoves } from './openings-actions.ts';
import { writeSync } from './openings-sync.ts';
import { startPractice } from './practice.ts';

// What the repertoire's page does: its tabs, the tree's rows unfolded,
// starred, removed and practiced, the user's studies read and their chapters
// practiced.

const movesOf = (button: HTMLElement): string[] =>
  button.dataset.lnExtMoves?.split(' ').filter(Boolean) ?? [];

/** The user's studies, read once a visit: the copy's own aside. */
export function loadStudies(session: Session): void {
  const { openings } = session.view;
  const user = document.body.dataset.user;
  if (!user || openings.studies.state === 'loading' || openings.studies.state === 'done') return;
  openings.studies = { state: 'loading' };
  void readStudies(session, user);
}

async function readStudies(session: Session, user: string): Promise<void> {
  const { openings } = session.view;
  const ours = new Set(Object.values(STUDY_NAMES));
  try {
    const studies = await listStudies(user);
    openings.studies = { state: 'done', value: studies.filter(study => !ours.has(study.name)) };
  } catch {
    openings.studies = { state: 'failed' };
  }
  session.redraw(true);
}

export function pickTab(session: Session, button: HTMLElement): void {
  const tab = button.dataset.lnExtValue;
  if (tab !== 'mine' && tab !== 'studies') return;
  session.view.openings.tab = tab;
  if (tab === 'studies') loadStudies(session);
}

export function toggleRow(session: Session, button: HTMLElement): void {
  const key = button.dataset.lnExtMoves ?? '';
  const { unfolded } = session.view.openings;
  if (unfolded.has(key)) unfolded.delete(key);
  else unfolded.add(key);
}

export function starLine(session: Session, button: HTMLElement): void {
  toggleFavorite(`${session.view.openings.side}|${movesOf(button).join(' ')}`);
}

/** Removes a branch at the second click, the first asking to be sure. */
export function pruneBranch(session: Session, button: HTMLElement): void {
  const { openings } = session.view;
  const from = movesOf(button);
  const san = button.dataset.lnExtValue ?? '';
  const key = `${from.join(' ')}|${san}`;
  if (openings.pruning !== key) {
    openings.pruning = key;
    return;
  }
  openings.pruning = null;
  const { side } = openings;
  const entries = storedRepertoire();
  const names = branchEntries(
    entries.filter(entry => entry.side === side),
    from,
    san,
  ).map(entry => entry.name);
  keepRepertoire(withoutBranch(entries, side, { from, san }));
  notePruned(side, [...from, san], names);
  writeSync();
}

/** Practice from a position of the user's repertoire, on its own lines. */
function practiceRepertoire(session: Session, analysis: Analysis, from: readonly string[]): void {
  const { side } = session.view.openings;
  const entries = storedRepertoire().filter(entry => entry.side === side);
  const positions = treeBook(withEntries(null, entries));
  const opening = nameAlong(side, from);
  loadMoves(analysis, from);
  startPractice(session, analysis, {
    side,
    opening,
    own: { kind: 'repertoire', name: '', positions },
  });
}

export function practiceRow(session: Session, analysis: Analysis, button: HTMLElement): void {
  practiceRepertoire(session, analysis, movesOf(button));
}

/** Unfolds a study on its chapters, read once, or folds it back. */
export function toggleStudy(session: Session, button: HTMLElement): void {
  const { openings } = session.view;
  const id = button.dataset.lnExtValue ?? '';
  if (openings.study?.id === id) {
    openings.study = null;
    return;
  }
  const study: NonNullable<typeof openings.study> = { id, chapters: { state: 'loading' } };
  openings.study = study;
  void readChapters(session, study);
}

async function readChapters(
  session: Session,
  study: NonNullable<Session['view']['openings']['study']>,
): Promise<void> {
  try {
    study.chapters = { state: 'done', value: await chaptersOf(study.id) };
  } catch {
    study.chapters = { state: 'failed' };
  }
  session.redraw(true);
}

/** Practice a chapter of the study unfolded: its moves to find, its variations to meet. */
export function startChapter(session: Session, analysis: Analysis, button: HTMLElement): void {
  const { study } = session.view.openings;
  if (study?.chapters.state !== 'done') return;
  const chapter = study.chapters.value[Number(button.dataset.lnExtValue)];
  if (!chapter) return;
  const own = { kind: 'study' as const, name: chapter.name, positions: treeBook(chapter.tree) };
  loadMoves(analysis, []);
  startPractice(session, analysis, { side: chapter.side, opening: chapter.name, own });
}
