import { createElement, queryAll, queryOne, setData, setText } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { showPanelPart } from '#content/layout/panel-tabs.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { readChapters, STUDY_PAGE, studyName } from './chapters.ts';

// A study's head at the top of its panel (styles/study-page/head.css): its flair, its
// name, its chapters and members, its likes and its sharing. Lichess draws them under the
// board, which our layout drops: the like and the share buttons click Lichess's own, and
// sharing opens the panel's Infos, where Lichess draws it.

const HEAD = 'ln-ext-study-head';
const UNDERBOARD = ':scope > .analyse__underboard';

interface Head {
  readonly root: HTMLElement;
  readonly flair: HTMLImageElement;
  readonly name: HTMLElement;
  readonly meta: HTMLElement;
  readonly like: HTMLButtonElement;
  readonly likes: HTMLElement;
  readonly share: HTMLButtonElement;
}

const heads = new WeakMap<HTMLElement, Head>();

const studyPage = (): HTMLElement | null => queryOne(document, STUDY_PAGE, HTMLElement);

function clickLichess(selector: string): HTMLElement | null {
  const page = studyPage();
  const target = page && queryOne(page, selector, HTMLElement);
  target?.click();
  return target;
}

function onShare(): void {
  showPanelPart('meta');
  const share = clickLichess(`${UNDERBOARD} .study__buttons .share`);
  // Below 1020px the panel's parts follow one another: the page scrolls down to it.
  if (share && !matchMedia('(min-width: 1020px)').matches)
    share.closest('.analyse__underboard')?.scrollIntoView({ behavior: 'smooth' });
}

function buildHead(): HTMLElement {
  const root = createElement('div', { className: HEAD });
  const tile = createElement('span', {
    className: `${HEAD}__tile`,
    attrs: { 'aria-hidden': 'true' },
  });
  const flair = createElement('img', { className: `${HEAD}__flair`, attrs: { alt: '' } });
  tile.append(flair);
  const name = createElement('p', { className: `${HEAD}__name` });
  const meta = createElement('p', { className: `${HEAD}__meta` });
  const words = createElement('div', { className: `${HEAD}__words` });
  words.append(name, meta);
  const like = createElement('button', { className: `${HEAD}__like`, attrs: { type: 'button' } });
  const likes = createElement('span', { className: `${HEAD}__likes` });
  like.append(likes);
  like.addEventListener('click', () => clickLichess(`${UNDERBOARD} .study__metadata .liking`));
  const share = createElement('button', { className: `${HEAD}__share`, attrs: { type: 'button' } });
  share.addEventListener('click', onShare);
  root.append(tile, words, like, share);
  heads.set(root, { root, flair, name, meta, like, likes, share });
  return root;
}

const ownHead = createOwnedElement(buildHead);

function setHidden(element: HTMLElement, hidden: boolean): void {
  if (element.hidden !== hidden) element.hidden = hidden;
}

function setTip(button: HTMLButtonElement, label: string): void {
  setData(button, 'lnExtTip', label || null);
  if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
}

function showLikes(head: Head, liking: HTMLElement | null): void {
  setHidden(head.like, !liking);
  if (!liking) return;
  setText(head.likes, liking.textContent.trim());
  setData(head.like, 'lnExtLiked', liking.classList.contains('liked') ? '' : null);
  setTip(head.like, liking.title);
}

function sync(): void {
  const page = studyPage();
  const metadata = page && queryOne(page, `${UNDERBOARD} > .study__metadata`, HTMLElement);
  const chapters = page && readChapters(page);
  const title = metadata && queryOne(metadata, 'h2 > .name', HTMLElement);
  if (!page || !chapters || !title) return;
  const head = heads.get(ownHead(page).element);
  if (!head) return;
  setText(head.name, studyName(title.textContent.trim(), chapters.title));
  const flair = queryOne(title, 'img.icon-flair', HTMLImageElement)?.src ?? '';
  if (head.flair.getAttribute('src') !== flair) head.flair.setAttribute('src', flair);
  setData(head.root, 'lnExtFlair', flair ? '' : null);
  // Lichess's own tab names: "64 Chapters", "3 Members".
  const counts = queryAll(
    page,
    '.study__side > .tabs-horiz > :is(.chapters, .members)',
    HTMLElement,
  );
  setText(head.meta, counts.map(tab => tab.textContent.trim()).join(' · '));
  showLikes(head, queryOne(metadata, '.liking', HTMLElement));
  const share = queryOne(page, `${UNDERBOARD} .study__buttons .share`, HTMLElement);
  setHidden(head.share, !share);
  if (share) setTip(head.share, share.title);
}

export const studyHead: Feature = {
  name: 'study head',
  start: () => onEveryTick('study head', sync),
};
