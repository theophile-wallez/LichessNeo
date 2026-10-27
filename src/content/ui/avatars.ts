import { userInHref } from '#shared/avatar.ts';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onOwnAvatar, ownAvatar, type OwnAvatar, userAvatar } from '#shared/own-avatar.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Gives each user their own avatar (#shared/avatar.ts) where ours stands in for
// a profile picture: the element that draws it gets the user's coach and color.
// Anonymous players and the computer keep the default, Lichess's own account gets
// its logo. The signed-in user's own picture, if they picked one, is a variable of
// ours (styles/theme/avatars.css).

interface Spot {
  readonly selector: string;
  /** The user's profile link in the spot; the spot itself when there's none. */
  readonly link?: string;
  /** Where the spot writes its user's name, when it has no link. */
  readonly name?: string;
}

const LICHESS = 'lichess';

const SPOTS: readonly Spot[] = [
  // The game page's player bars, and ours on the analysis board.
  { selector: 'main.round .ruser, main.analyse > .ln-ext-player', link: ':scope > a.user-link' },
  // The game info's players, without a chat.
  { selector: 'main.round .game__meta__players > .player', link: ':scope > a.user-link' },
  { selector: '#powerTip .upt__info', link: '.upt__info__top > a.user-link' },
  { selector: '#friend_box .content a.user-link' },
  // A study card's owner and members (content/pages/study-cards.ts).
  { selector: '.study-index a.ln-ext-study__avatar' },
  { selector: '.study-index a.ln-ext-study__owner' },
  {
    selector: "main.box.page-small[data-ln-ext-list='players'] > table.slist > tbody > tr",
    link: ':scope > td:first-child > .user-link',
  },
  { selector: 'main.forum-topic .forum-post', link: '.forum-post__metas > a.author' },
  // A finished tournament's podium: each player stands on their step.
  { selector: 'main:is(.tour, .swiss) .podium > div', link: ':scope > a.user-link' },
  // A profile names its user in a span with a `data-href`.
  { selector: '.user-show > .user-show__header', link: 'h1 [data-href]' },
  // The inbox's contacts, and the conversation open, whose head and messages show it.
  { selector: 'main.msg-app .msg-app__side__contact', name: '.msg-app__side__contact__name' },
  { selector: 'main.msg-app .msg-app__convo', link: '.msg-app__convo__head a.user-link' },
];

// A contact's name sits beside its flair and title, in elements of their own.
const ownText = (element: Element): string =>
  [...element.childNodes]
    .filter(node => node instanceof Text)
    .map(node => node.data)
    .join('')
    .trim();

function userIn(spot: HTMLElement, { link, name }: Spot): string | undefined {
  if (name !== undefined) {
    const label = queryOne(spot, name, HTMLElement);
    return label ? nonEmpty(ownText(label)) : undefined;
  }
  const anchor = link === undefined ? spot : queryOne(spot, link, HTMLElement);
  return userInHref(anchor?.getAttribute('href') ?? anchor?.dataset.href);
}

function markAvatar(element: HTMLElement, user: string | undefined): void {
  const lichess = user?.toLowerCase() === LICHESS;
  const avatar = user === undefined || lichess ? null : userAvatar(user);
  setData(element, 'lnExtAvatarLichess', lichess ? '' : null);
  setData(element, 'lnExtAvatarCoach', avatar && String(avatar.coach));
  setData(element, 'lnExtAvatarColor', avatar && avatar.color);
  setData(element, 'lnExtAvatarPicture', avatar?.picture ? '' : null);
}

const PICTURE_STYLE = 'ln-ext-own-avatar';

// In a stylesheet of ours: a data: URL too long for <html>'s style attribute.
function showPicture(avatar: OwnAvatar | null): void {
  const rule =
    avatar?.kind === 'picture' ? `:root{--ln-ext-avatar-own:url(${avatar.picture})}` : '';
  let style = document.getElementById(PICTURE_STYLE);
  if (!style && rule === '') return;
  if (!style) {
    style = createElement('style', { id: PICTURE_STYLE });
    (document.head ?? document.documentElement).append(style);
  }
  if (style.textContent !== rule) style.textContent = rule;
}

export function syncAvatars(root: ParentNode = document): void {
  for (const spot of SPOTS) {
    for (const element of queryAll(root, spot.selector, HTMLElement))
      markAvatar(element, userIn(element, spot));
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
