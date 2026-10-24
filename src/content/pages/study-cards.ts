import FavouriteIcon from '@hugeicons/core-free-icons/FavouriteIcon';
import SquareLock02Icon from '@hugeicons/core-free-icons/SquareLock02Icon';
import { nameHash } from '#shared/avatar.ts';
import { createElement, queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { pageLocale } from '#shared/lang.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The study lists' cards (styles/study/card.css): a glow in a hue of the
// study's own, its likes as a pill, its owner under the title and its members
// as avatars (content/ui/avatars.ts draws them). Lichess writes the likes, the
// owner and the date as one line of text, so this reads them out of it; the
// line and the members' list stay, hidden. The list is server-rendered, its
// next pages appended as one scrolls.

const CARDS = '.study-index .studies .study:not(.compact, [data-ln-ext-study])';

// No yellow: over a dark card it turns olive.
const HUES = ['accent', 'cyan', 'green', 'orange', 'pink', 'purple'] as const;

export interface StudyLine {
  readonly likes: number;
  readonly owner: string;
}

/** Lichess's "♡ 279 • owner • 5 days ago": the likes and the owner, in that order. */
export function readStudyLine(line: string): StudyLine | null {
  const [likes = '', owner = ''] = line.split('•').map(part => part.trim());
  if (!/^\d+$/.test(likes) || owner === '') return null;
  return { likes: Number(likes), owner };
}

/** A study's hue, the same on every visit: picked from its id. */
export const studyHue = (id: string): (typeof HUES)[number] =>
  HUES[nameHash(id) % HUES.length] ?? 'accent';

/** The user a name stands for: its last word, past a title ("FM NaSil"). */
export const userOfName = (name: string): string => name.trim().split(/\s+/).at(-1) ?? '';

// A link, so a click on an avatar or a name leads to the user, over the card's own link.
function userLink(name: string, className: string): HTMLAnchorElement {
  return createElement('a', {
    className: `${className} ulpt`,
    attrs: { href: `/@/${userOfName(name)}`, title: name },
  });
}

function byline(owner: string, isPrivate: boolean): HTMLElement {
  const line = createElement('div', { className: 'ln-ext-study__by' });
  const name = userLink(owner, 'ln-ext-study__owner');
  name.append(
    createElement('span', { className: 'ln-ext-study__avatar' }),
    createElement('span', { text: owner }),
  );
  line.append(name);
  if (isPrivate) {
    const lock = createElement('span', { className: 'ln-ext-study__private' });
    setHtml(lock, hugeicon(SquareLock02Icon));
    line.append(lock);
  }
  return line;
}

function likesPill(likes: number): HTMLElement {
  const pill = createElement('span', { className: 'ln-ext-study__likes' });
  const count = new Intl.NumberFormat(pageLocale()).format(likes);
  setHtml(pill, html`${hugeicon(FavouriteIcon)}${count}`);
  return pill;
}

function footer(card: HTMLElement): HTMLElement {
  const foot = createElement('div', { className: 'ln-ext-study__foot' });
  const members = createElement('div', { className: 'ln-ext-study__members' });
  for (const member of queryAll(card, '.members li', HTMLElement)) {
    const name = member.textContent.trim();
    if (name !== '') members.append(userLink(name, 'ln-ext-study__avatar'));
  }
  foot.append(members);
  // Lichess's script writes the date's words, in the page's language, into any `.timeago`.
  const time = queryOne(card, '.top time', HTMLTimeElement);
  if (time) {
    foot.append(
      createElement('time', { className: 'timeago', attrs: { datetime: time.dateTime } }),
    );
  }
  return foot;
}

function redrawCard(card: HTMLElement): void {
  const id = queryOne(card, 'a.overlay', HTMLAnchorElement)?.pathname.split('/').at(-1) ?? '';
  setStyleProperty(card, '--ln-ext-study-hue', `var(--ln-ext-${studyHue(id)})`);
  const meta = queryOne(card, '.top span', HTMLElement);
  const study = meta && readStudyLine(meta.textContent);
  if (!meta || !study) {
    setData(card, 'lnExtStudy', 'plain');
    return;
  }
  meta.after(byline(study.owner, queryOne(meta, '.private', HTMLElement) !== null));
  card.append(likesPill(study.likes), footer(card));
  setData(card, 'lnExtStudy', 'card');
}

export function syncStudyCards(): void {
  for (const card of queryAll(document, CARDS, HTMLElement)) redrawCard(card);
}

export const studyCards: Feature = {
  name: 'study cards',
  start: () => onEveryTick('study cards', syncStudyCards),
};
