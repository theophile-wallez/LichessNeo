import { userInHref } from '#shared/avatar.ts';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onOwnAvatar, ownAvatar, type OwnAvatar, userAvatar } from '#shared/own-avatar.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Gives each user their own avatar (#shared/avatar.ts) where ours stands in for
// a profile picture: the element that draws it gets the user's coach and color.
// Anonymous players and the computer keep the default. The signed-in user's own
// picture, if they picked one, is a variable of ours (styles/theme/avatars.css).

interface Spot {
  readonly selector: string;
  /** The user's profile link in the spot; the spot itself when there's none. */
  readonly link?: string;
}

const SPOTS: readonly Spot[] = [
  // The game page's player bars, and ours on the analysis board.
  { selector: 'main.round .ruser, main.analyse > .lr-ext-player', link: ':scope > a.user-link' },
  // The game info's players, without a chat.
  { selector: 'main.round .game__meta__players > .player', link: ':scope > a.user-link' },
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
  const avatar = user === undefined ? null : userAvatar(user);
  setData(element, 'lrExtAvatarCoach', avatar && String(avatar.coach));
  setData(element, 'lrExtAvatarColor', avatar && avatar.color);
  setData(element, 'lrExtAvatarPicture', avatar?.picture ? '' : null);
}

const PICTURE_STYLE = 'lr-ext-own-avatar';

// In a stylesheet of ours: a data: URL too long for <html>'s style attribute.
function showPicture(avatar: OwnAvatar | null): void {
  const rule =
    avatar?.kind === 'picture' ? `:root{--lr-ext-avatar-own:url(${avatar.picture})}` : '';
  let style = document.getElementById(PICTURE_STYLE);
  if (!style && rule === '') return;
  if (!style) {
    style = createElement('style', { id: PICTURE_STYLE });
    (document.head ?? document.documentElement).append(style);
  }
  if (style.textContent !== rule) style.textContent = rule;
}

export function syncAvatars(root: ParentNode = document): void {
  for (const { selector, link } of SPOTS) {
    for (const spot of queryAll(root, selector, HTMLElement)) markAvatar(spot, userIn(spot, link));
  }
}

export const avatars: Feature = {
  name: 'avatars',
  start: () => {
    showPicture(ownAvatar());
    onOwnAvatar(avatar => {
      showPicture(avatar);
      syncAvatars();
    });
    onEveryTick('avatars', () => syncAvatars());
  },
};
