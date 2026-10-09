import { afterEach, describe, expect, it } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { queryOne } from '#shared/dom.ts';
import { syncAvatars } from './avatars.ts';

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
];

function avatarIn(selector: string): HTMLElement {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
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
