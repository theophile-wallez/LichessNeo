import { avatarOf, userInHref } from '#shared/avatar.ts';
import { queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Gives each user their own avatar (#shared/avatar.ts) where ours stands in for
// a profile picture: the element that draws it gets the user's coach and color.
// Anonymous players and the computer keep the default.

interface Spot {
  readonly selector: string;
  /** The user's profile link in the spot; the spot itself when there's none. */
  readonly link?: string;
}

const SPOTS: readonly Spot[] = [
  // The game page's player bars, and ours on the analysis board.
  { selector: 'main.round .ruser, main.analyse > .lr-ext-player', link: ':scope > a.user-link' },
  { selector: '#powerTip .upt__info', link: '.upt__info__top > a.user-link' },
  { selector: '#friend_box .content a.user-link' },
  {
    selector: "main.box.page-small[data-lr-ext-list='players'] > table.slist > tbody > tr",
    link: ':scope > td:first-child > .user-link',
  },
  { selector: 'main.forum-topic .forum-post', link: '.forum-post__metas > a.author' },
  // A finished tournament's podium: each player stands on their step.
  { selector: 'main:is(.tour, .swiss) .podium > div', link: ':scope > a.user-link' },
  // A profile names its user in a span with a `data-href`.
  { selector: '.user-show > .user-show__header', link: 'h1 [data-href]' },
];

function userIn(spot: HTMLElement, link: string | undefined): string | undefined {
  const anchor = link === undefined ? spot : queryOne(spot, link, HTMLElement);
  return userInHref(anchor?.getAttribute('href') ?? anchor?.dataset.href);
}

export function markAvatar(element: HTMLElement, user: string | undefined): void {
  const avatar = user === undefined ? null : avatarOf(user);
  setData(element, 'lrExtAvatarCoach', avatar && String(avatar.coach));
  setData(element, 'lrExtAvatarColor', avatar && avatar.color);
}

export function syncAvatars(root: ParentNode = document): void {
  for (const { selector, link } of SPOTS) {
    for (const spot of queryAll(root, selector, HTMLElement)) markAvatar(spot, userIn(spot, link));
  }
}

export const avatars: Feature = {
  name: 'avatars',
  start: () => onEveryTick('avatars', () => syncAvatars()),
};
