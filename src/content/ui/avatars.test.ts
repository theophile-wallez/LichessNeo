import { afterEach, describe, expect, it } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { queryOne } from '#shared/dom.ts';
import { keepOwnAvatar } from '#shared/own-avatar.ts';
import { IMAGE } from '#shared/testing/packs.ts';
import { avatars, syncAvatars } from './avatars.ts';

// Each spot as Lichess serves it, with the element our avatar is drawn on.
const SPOTS = [
  {
    name: 'a game’s player bar',
    markup:
      '<main class="round"><div class="ruser-top ruser user-link online"><i class="line"></i>' +
      '<a class="user-link ulpt" href="/@/tjychess"><span class="utitle">GM</span>&nbsp;tjychess</a>' +
      '<rating>3062</rating></div></main>',
    avatar: '.ruser',
  },
  {
    name: 'the analysis board’s bar',
    markup:
      '<main class="analyse"><div class="lr-ext-player lr-ext-player--top">' +
      '<a class="user-link" href="/@/tjychess">tjychess</a></div></main>',
    avatar: '.lr-ext-player',
  },
  {
    name: 'a player of the game info',
    markup:
      '<main class="round"><div class="round__side"><div class="game__meta">' +
      '<div class="game__meta__players"><div class="player color-icon is white text">' +
      '<a class="user-link ulpt" href="/@/tjychess">tjychess</a></div></div></div></div></main>',
    avatar: '.player',
  },
  {
    name: 'the hover card',
    markup:
      '<div id="powerTip"><div class="upt__info"><div class="upt__info__top">' +
      '<a class="offline user-link" href="/@/tjychess">tjychess</a></div></div></div>',
    avatar: '.upt__info',
  },
  {
    name: 'the friends box',
    markup:
      '<div id="friend_box"><div class="content"><div>' +
      '<a class="user-link ulpt" data-href="/@/tjychess">tjychess</a></div></div></div>',
    avatar: 'a.user-link',
  },
  {
    name: 'a list of players',
    markup:
      '<main class="box page-small" data-lr-ext-list="players"><table class="slist"><tbody><tr>' +
      '<td><a class="user-link ulpt" href="/@/tjychess">tjychess</a></td><td>2400</td>' +
      '</tr></tbody></table></main>',
    avatar: 'tr',
  },
  {
    name: 'a forum post',
    markup:
      '<main class="forum forum-topic"><div class="forum-post"><div class="forum-post__metas">' +
      '<a class="offline user-link author ulpt" href="/@/tjychess">tjychess</a>' +
      '<a href="/forum/general/topic#1"><time></time></a></div>' +
      '<div class="forum-post__message"><a href="/@/someone_else">@someone_else</a></div></div></main>',
    avatar: '.forum-post',
  },
  {
    name: 'a profile',
    markup:
      '<div class="user-show"><div class="user-show__header"><h1 class="user-link offline">' +
      '<a href="/patron"><icon class="line patron"></icon></a>' +
      '<span class="user-link" data-href="/@/tjychess"><span class="utitle">GM</span>&nbsp;tjychess</span>' +
      '</h1></div></div>',
    avatar: '.user-show__header',
  },
  {
    name: 'a tournament’s podium',
    markup:
      '<main class="swiss"><div class="podium"><div class="first"><div class="trophy"></div>' +
      '<a class="user-link ulpt" href="/@/tjychess">tjychess</a><table class="stats"></table>' +
      '</div></div></main>',
    avatar: '.first',
  },
];

function avatarIn(selector: string): HTMLElement {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return element;
}

const pictureRule = (): string | null =>
  document.getElementById('lr-ext-own-avatar')?.textContent ?? null;

afterEach(() => {
  keepOwnAvatar(null);
  document.body.innerHTML = '';
  delete document.body.dataset.user;
  document.getElementById('lr-ext-own-avatar')?.remove();
});

describe('syncAvatars', () => {
  const { coach, color } = avatarOf('tjychess');

  it.each(SPOTS)('gives $name its user’s avatar', ({ markup, avatar }) => {
    document.body.innerHTML = markup;
    syncAvatars();
    const element = avatarIn(avatar);
    expect(element.dataset.lrExtAvatarCoach).toBe(String(coach));
    expect(element.dataset.lrExtAvatarColor).toBe(color);
  });

  it('leaves the computer and anonymous players the default', () => {
    document.body.innerHTML =
      '<main class="round"><div class="ruser-top ruser"><name>Stockfish level 3</name></div>' +
      '<div class="ruser-bottom ruser"><name>Anonymous</name></div></main>';
    syncAvatars();
    for (const bar of document.querySelectorAll('.ruser'))
      expect(bar.getAttributeNames().filter(name => name.startsWith('data-lr-ext-avatar'))).toEqual(
        [],
      );
  });

  it('follows the bar to its next player, and drops the avatar when there’s none', () => {
    document.body.innerHTML =
      '<main class="round"><div class="ruser"><a class="user-link" href="/@/tjychess">tjychess</a></div></main>';
    syncAvatars();
    const bar = avatarIn('.ruser');
    const next = avatarOf('Hikaru');
    bar.innerHTML = '<a class="user-link" href="/@/Hikaru">Hikaru</a>';
    syncAvatars();
    expect([bar.dataset.lrExtAvatarCoach, bar.dataset.lrExtAvatarColor]).toEqual([
      String(next.coach),
      next.color,
    ]);
    bar.innerHTML = '<name>Anonymous</name>';
    syncAvatars();
    expect(bar.dataset.lrExtAvatarCoach).toBeUndefined();
    expect(bar.dataset.lrExtAvatarColor).toBeUndefined();
  });
});

describe('the signed-in user’s own avatar', () => {
  const BAR =
    '<main class="round"><div class="ruser"><a class="user-link" href="/@/tjychess">tjychess</a></div></main>';

  it('gives the user the coach they picked, and no one else', () => {
    document.body.innerHTML = BAR;
    keepOwnAvatar({ kind: 'coach', coach: 8, color: 'pink' });
    syncAvatars();
    expect(avatarIn('.ruser').dataset.lrExtAvatarCoach).toBe(String(avatarOf('tjychess').coach));
    document.body.dataset.user = 'tjychess';
    syncAvatars();
    const bar = avatarIn('.ruser');
    expect([bar.dataset.lrExtAvatarCoach, bar.dataset.lrExtAvatarColor]).toEqual(['8', 'pink']);
    expect(bar.dataset.lrExtAvatarPicture).toBeUndefined();
  });

  it('marks the user’s picture over their name’s coach, and drops the mark with the pick', () => {
    document.body.innerHTML = BAR;
    document.body.dataset.user = 'tjychess';
    keepOwnAvatar({ kind: 'picture', picture: IMAGE });
    syncAvatars();
    const bar = avatarIn('.ruser');
    expect(bar.dataset.lrExtAvatarPicture).toBe('');
    expect(bar.dataset.lrExtAvatarCoach).toBe(String(avatarOf('tjychess').coach));
    keepOwnAvatar(null);
    syncAvatars();
    expect(bar.dataset.lrExtAvatarPicture).toBeUndefined();
  });

  it('shows a picture kept before the page loaded', () => {
    keepOwnAvatar({ kind: 'picture', picture: IMAGE });
    avatars.start();
    expect(pictureRule()).toBe(`:root{--lr-ext-avatar-own:url(${IMAGE})}`);
  });

  it('puts the picture in a stylesheet of ours, and follows the pick at once', () => {
    document.body.innerHTML = BAR;
    document.body.dataset.user = 'tjychess';
    avatars.start();
    expect(pictureRule()).toBeNull();
    keepOwnAvatar({ kind: 'picture', picture: IMAGE });
    expect(pictureRule()).toBe(`:root{--lr-ext-avatar-own:url(${IMAGE})}`);
    expect(avatarIn('.ruser').dataset.lrExtAvatarPicture).toBe('');
    keepOwnAvatar({ kind: 'coach', coach: 3, color: 'blue' });
    expect(pictureRule()).toBe('');
    expect(avatarIn('.ruser').dataset.lrExtAvatarCoach).toBe('3');
  });
});
