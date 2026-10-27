import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { syncInbox } from './inbox.ts';

// The inbox as Lichess serves it: the list, then a conversation one can answer.
const REPLY_FORM =
  '<form class="msg-app__convo__post"><textarea class="msg-app__convo__post__text"></textarea>' +
  '<button class="msg-app__convo__post__submit button" type="submit"></button></form>';

const inboxMarkup = (user: string, reply: string): string =>
  '<main class="box msg-app pane-convo"><div class="msg-app__side">' +
  '<div class="msg-app__side__search"><input></div><div class="msg-app__contacts"></div></div>' +
  '<div class="msg-app__convo"><div class="msg-app__convo__head">' +
  `<div class="msg-app__convo__head__left"><a class="user-link ulpt online" href="/@/${user}">` +
  `<icon class="line"></icon>${user}</a></div><div class="msg-app__convo__head__actions">` +
  `<a class="msg-app__convo__action button button-empty play" href="/?user=${user}#friend" ` +
  'title="Défier"></a></div></div><div class="msg-app__convo__msgs"></div>' +
  `<div class="msg-app__convo__reply">${reply}</div></div></main>`;

const { dataset } = document.documentElement;

function element(selector: string): HTMLElement {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

const challenges = (): HTMLAnchorElement[] =>
  queryAll(document, '.ln-ext-inbox__challenge', HTMLAnchorElement);

beforeEach(() => {
  dataset.lnExtInboxLabel = 'Messagerie';
  dataset.lnExtOnlineLabel = 'en ligne';
});

afterEach(() => {
  delete dataset.lnExtInboxLabel;
  delete dataset.lnExtOnlineLabel;
  document.body.replaceChildren();
});

describe('syncInbox', () => {
  it('titles the list with Lichess’s word, once', () => {
    document.body.innerHTML = inboxMarkup('fafaon80', REPLY_FORM);
    syncInbox();
    syncInbox();
    const titles = queryAll(document, '.msg-app__side > h1.ln-ext-inbox__title', HTMLElement);
    expect(titles.map(title => title.textContent)).toEqual(['Messagerie']);
    expect(element('.msg-app__side').firstElementChild).toBe(titles[0]);
  });

  it('gives the conversation’s head the word for online', () => {
    document.body.innerHTML = inboxMarkup('fafaon80', REPLY_FORM);
    syncInbox();
    expect(element('.msg-app__convo__head a.user-link').dataset.lnExtLabel).toBe('en ligne');
  });

  it('puts the challenge beside the message box, and marks the app so the head’s hides', () => {
    document.body.innerHTML = inboxMarkup('fafaon80', REPLY_FORM);
    syncInbox();
    const [challenge] = challenges();
    expect(challenge?.parentElement).toBe(element('.msg-app__convo__reply'));
    expect(challenge?.getAttribute('href')).toBe('/?user=fafaon80#friend');
    expect(challenge?.textContent).toBe('Défier');
    expect(element('main.msg-app').dataset.lnExtChallenge).toBe('');
  });

  it('follows the conversation to the next user', () => {
    document.body.innerHTML = inboxMarkup('fafaon80', REPLY_FORM);
    syncInbox();
    element('a.play').setAttribute('href', '/?user=planchon#friend');
    syncInbox();
    expect(challenges().map(link => link.getAttribute('href'))).toEqual(['/?user=planchon#friend']);
  });

  it('leaves Lichess’s button where the conversation can’t be answered', () => {
    document.body.innerHTML = inboxMarkup('fafaon80', REPLY_FORM);
    syncInbox();
    // Snabbdom swaps its own node, and leaves ours.
    const block = document.createElement('div');
    block.className = 'msg-app__convo__reply__block';
    element('form').replaceWith(block);
    syncInbox();
    expect(challenges()).toEqual([]);
    expect(element('main.msg-app').dataset.lnExtChallenge).toBeUndefined();
  });

  it('touches nothing off the inbox', () => {
    document.body.innerHTML = '<main class="box"><div class="msg-app__side"></div></main>';
    syncInbox();
    expect(document.querySelector('.ln-ext-inbox__title')).toBeNull();
  });
});
