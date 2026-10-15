import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { ownNameFeature, syncOwnName } from './own-name.ts';

// Where Lichess writes the signed-in user's name, and another player's beside it.
const PAGE =
  '<header><a id="user_tag" href="/@/Eresy">Eresy</a></header>' +
  '<main class="round"><div class="ruser-bottom ruser user-link">' +
  '<a class="user-link ulpt" href="/@/eresy"><span class="utitle">FM</span>&nbsp;Eresy</a></div>' +
  '<div class="ruser-top ruser user-link"><a class="user-link ulpt" href="/@/Hikaru">Hikaru</a></div>' +
  '<a class="games" href="/@/Eresy/all">Eresy</a>' +
  '<a class="mod" href="/@/eresy?mod">Eresy</a>' +
  '<span class="user-link" data-href="/@/Eresy">Eresy</span>' +
  '<a class="profile" href="/@/Eresy">Profile</a>' +
  '<p class="chat">Eresy</p></main>';

const texts = (selector: string): string[] =>
  queryAll(document, selector, HTMLElement).map(element => element.textContent);

const ownSpots = (): string[] =>
  texts('#user_tag, .ruser-bottom a, .games, .mod, span.user-link[data-href]');

function signIn(): void {
  document.body.dataset.user = 'eresy';
  document.body.dataset.username = 'Eresy';
}

beforeEach(() => {
  document.body.innerHTML = PAGE;
});

afterEach(() => {
  keepOwnName(null);
  syncOwnName();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
  delete document.body.dataset.username;
});

describe('syncOwnName', () => {
  it('writes the user’s own name wherever Lichess writes theirs, and only there', () => {
    signIn();
    keepOwnName('Captain Kitty');
    syncOwnName();
    expect(ownSpots()).toEqual([
      'Captain Kitty',
      'FM\u00A0Captain Kitty',
      'Captain Kitty',
      'Captain Kitty',
      'Captain Kitty',
    ]);
    expect(texts('.ruser-top a, .profile, .chat')).toEqual(['Hikaru', 'Profile', 'Eresy']);
  });

  it('puts Lichess’s name back as the pick is dropped', () => {
    signIn();
    keepOwnName('Captain Kitty');
    syncOwnName();
    keepOwnName(null);
    syncOwnName();
    expect(ownSpots()).toEqual(['Eresy', 'FM\u00A0Eresy', 'Eresy', 'Eresy', 'Eresy']);
  });

  it('follows a new pick, and Lichess writing the name again', () => {
    signIn();
    keepOwnName('Captain Kitty');
    syncOwnName();
    keepOwnName('Kitty');
    const tag = queryOne(document, '#user_tag', HTMLElement);
    if (!tag) throw new Error('no #user_tag');
    tag.textContent = 'Eresy';
    syncOwnName();
    expect(ownSpots()).toEqual(['Kitty', 'FM\u00A0Kitty', 'Kitty', 'Kitty', 'Kitty']);
  });

  it('writes a name as it is typed, even with what a replacement reads as patterns', () => {
    signIn();
    keepOwnName('Rich $& Co');
    syncOwnName();
    expect(texts('#user_tag')).toEqual(['Rich $& Co']);
  });

  it('leaves what Lichess wrote in place of ours since', () => {
    signIn();
    keepOwnName('Captain Kitty');
    syncOwnName();
    // snabbdom patches a text in place, keeping its node.
    const text = queryOne(document, '#user_tag', HTMLElement)?.firstChild;
    if (!(text instanceof Text)) throw new Error('no #user_tag text');
    text.data = 'Inbox';
    keepOwnName(null);
    syncOwnName();
    expect(text.data).toBe('Inbox');
  });

  it('changes nothing signed out, nor for a user Lichess names oddly', () => {
    keepOwnName('Captain Kitty');
    syncOwnName();
    expect(ownSpots()).toEqual(['Eresy', 'FM\u00A0Eresy', 'Eresy', 'Eresy', 'Eresy']);
    document.body.dataset.user = "eresy'], a";
    document.body.dataset.username = 'Eresy';
    syncOwnName();
    expect(ownSpots()).toEqual(['Eresy', 'FM\u00A0Eresy', 'Eresy', 'Eresy', 'Eresy']);
  });
});

describe('ownNameFeature', () => {
  it('renames at once as the name is picked, without waiting for a tick', () => {
    signIn();
    ownNameFeature.start();
    keepOwnName('Captain Kitty');
    expect(texts('#user_tag')).toEqual(['Captain Kitty']);
    keepOwnName(null);
    expect(texts('#user_tag')).toEqual(['Eresy']);
  });
});
