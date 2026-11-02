import {
  centerInScroller,
  closestTo,
  createElement,
  queryAll,
  queryOne,
  setData,
  setStyleProperty,
  setText,
} from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { type Chapters, namesPlayers, readChapters, STUDY_PAGE } from './chapters.ts';

// A study's chapter over its board (styles/study-page/chapter-bar.css): its number and
// name, the chapters beside it a click away, a new one for those who can edit the study,
// and the contents, Lichess's own chapter list,
// which opens as a sheet over the board (sheet.css) while `data-ln-ext-contents` is on the
// page. Picking a chapter there closes it. Lichess's player bars stay only while they name
// players (`data-ln-ext-players`): the bar takes their room.

const BAR = 'ln-ext-study-bar';
const CHAPTERS_TAB =
  ':scope > .analyse__side > .study__side > .tabs-horiz > button.chapters:not(.active)';

interface Bar {
  readonly root: HTMLElement;
  readonly number: HTMLElement;
  readonly kicker: HTMLElement;
  readonly title: HTMLElement;
  readonly previous: HTMLButtonElement;
  readonly next: HTMLButtonElement;
  readonly add: HTMLButtonElement;
  readonly progress: HTMLElement;
}

let open = false;
const bars = new WeakMap<HTMLElement, Bar>();

function stepButton(direction: 'previous' | 'next', step: number): HTMLButtonElement {
  const label = message(direction === 'next' ? 'studyNextChapter' : 'studyPreviousChapter');
  const button = createElement('button', {
    className: `${BAR}__step ${BAR}__step--${direction}`,
    attrs: { type: 'button', 'aria-label': label, 'data-ln-ext-tip': label },
  });
  button.addEventListener('click', () => goTo(step));
  return button;
}

function addButton(): HTMLButtonElement {
  const label = message('studyAddChapter');
  const button = createElement('button', {
    className: `${BAR}__add`,
    attrs: { type: 'button', 'aria-label': label, 'data-ln-ext-tip': label },
  });
  button.hidden = true;
  button.addEventListener('click', () => {
    const page = studyPage();
    const add = page && readChapters(page)?.add;
    setOpen(false);
    add?.click();
  });
  return button;
}

function buildBar(): HTMLElement {
  const root = createElement('div', { className: BAR });
  const number = createElement('span', { className: `${BAR}__number` });
  const words = createElement('button', {
    className: `${BAR}__words`,
    attrs: { type: 'button', 'aria-expanded': 'false' },
  });
  const kicker = createElement('span', { className: `${BAR}__kicker` });
  const title = createElement('span', { className: `${BAR}__title` });
  words.append(kicker, title);
  words.addEventListener('click', () => setOpen(!open));
  const previous = stepButton('previous', -1);
  const next = stepButton('next', 1);
  const add = addButton();
  const progress = createElement('span', { className: `${BAR}__progress` });
  root.append(number, words, previous, next, add, progress);
  bars.set(root, { root, number, kicker, title, previous, next, add, progress });
  return root;
}

function buildBackdrop(): HTMLElement {
  const backdrop = createElement('div', { className: 'ln-ext-study-backdrop' });
  backdrop.addEventListener('click', () => setOpen(false));
  return backdrop;
}

const ownBar = createOwnedElement(buildBar);
const ownBackdrop = createOwnedElement(buildBackdrop);

const studyPage = (): HTMLElement | null => queryOne(document, STUDY_PAGE, HTMLElement);

function goTo(step: number): void {
  const page = studyPage();
  const chapters = page && readChapters(page);
  chapters?.buttons[chapters.index + step]?.click();
}

function setOpen(value: boolean): void {
  open = value;
  const page = studyPage();
  if (!page) return;
  sync();
  const active = open && readChapters(page)?.buttons.find(button => button.matches('.active'));
  // The list was out of sight, where Lichess couldn't scroll its chapter into view.
  if (active) centerInScroller(active);
}

function show(bar: Bar, chapters: Chapters): void {
  const total = chapters.buttons.length;
  setText(bar.number, String(chapters.index + 1));
  setText(bar.kicker, message('studyChapterOf', String(chapters.index + 1), String(total)));
  setText(bar.title, chapters.title);
  const first = chapters.index === 0;
  if (bar.previous.disabled !== first) bar.previous.disabled = first;
  const last = chapters.index === total - 1;
  if (bar.next.disabled !== last) bar.next.disabled = last;
  const editable = chapters.add !== null;
  if (bar.add.hidden === editable) bar.add.hidden = !editable;
  setStyleProperty(bar.progress, '--ln-ext-progress', String((chapters.index + 1) / total));
}

function showsPlayers(page: HTMLElement, title: string): boolean {
  const names = queryAll(page, '.study__player .info', HTMLElement).map(info =>
    info.textContent.trim(),
  );
  return namesPlayers(names, title, page.querySelector('.study__player .result') !== null);
}

function sync(): void {
  const page = studyPage();
  if (!page) return;
  setData(page, 'lnExtContents', open ? '' : null);
  const chapters = readChapters(page);
  if (!chapters) {
    // Lichess opens a one-chapter study on its members, where the bar can't read the
    // chapter: back to the chapters once the sheet is closed.
    if (!open) queryOne(page, CHAPTERS_TAB, HTMLButtonElement)?.click();
    return;
  }
  const bar = bars.get(ownBar(page).element);
  ownBackdrop(page);
  if (!bar) return;
  show(bar, chapters);
  setData(page, 'lnExtPlayers', showsPlayers(page, chapters.title) ? '' : null);
  const words = queryOne(bar.root, `.${BAR}__words`, HTMLElement);
  if (words?.getAttribute('aria-expanded') !== String(open))
    words?.setAttribute('aria-expanded', String(open));
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open) setOpen(false);
}

// A chapter picked in the sheet: Lichess draws it, the sheet goes.
function onListClick(event: MouseEvent): void {
  if (open && closestTo(event.target, '.study-list > button', HTMLElement)) setOpen(false);
}

export const studyChapterBar: Feature = {
  name: 'study chapter bar',
  start: () => {
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onListClick);
    onEveryTick('study chapter bar', sync);
  },
};
