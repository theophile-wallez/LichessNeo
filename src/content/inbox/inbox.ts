import { createElement, queryOne, setData, setText } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The inbox (styles/inbox) as a messaging app: its list gets a title, the
// conversation's head says when the other user is online, and the challenge
// button stands beside the message box. Snabbdom draws the page, so the button
// is a link of ours, and Lichess's stays in the head, hidden. The words are
// Lichess's, from src/page/labels.

const TITLE = 'ln-ext-inbox__title';
const CHALLENGE = 'ln-ext-inbox__challenge';

function syncTitle(side: HTMLElement, label: string | undefined): void {
  let title = queryOne(side, `:scope > .${TITLE}`, HTMLElement);
  if (label === undefined) {
    title?.remove();
    return;
  }
  if (!title) {
    title = createElement('h1', { className: TITLE });
    side.prepend(title);
  }
  setText(title, label);
}

function placeChallenge(reply: HTMLElement, play: HTMLAnchorElement): void {
  let link = queryOne(reply, `:scope > .${CHALLENGE}`, HTMLAnchorElement);
  if (!link) {
    link = createElement('a', { className: CHALLENGE, attrs: { 'data-icon': '\ue033' } });
    reply.prepend(link);
  }
  const href = play.getAttribute('href') ?? '';
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  setText(link, play.title);
}

// Only beside a message box: a conversation that can't be answered keeps Lichess's button.
function syncChallenge(app: HTMLElement): void {
  const play = queryOne(app, '.msg-app__convo__head a.play', HTMLAnchorElement);
  const reply = queryOne(app, '.msg-app__convo__reply', HTMLElement);
  const open = play !== null && reply !== null && queryOne(reply, 'form', HTMLFormElement) !== null;
  if (open) placeChallenge(reply, play);
  else app.querySelector(`.${CHALLENGE}`)?.remove();
  setData(app, 'lnExtChallenge', open ? '' : null);
}

export function syncInbox(): void {
  const app = queryOne(document, 'main.msg-app', HTMLElement);
  if (!app) return;
  const labels = document.documentElement.dataset;
  const side = queryOne(app, ':scope > .msg-app__side', HTMLElement);
  if (side) syncTitle(side, labels.lnExtInboxLabel);
  const user = queryOne(app, '.msg-app__convo__head a.user-link', HTMLElement);
  if (user) setData(user, 'lnExtLabel', labels.lnExtOnlineLabel ?? null);
  syncChallenge(app);
}

export const inbox: Feature = {
  name: 'inbox',
  start: () => onEveryTick('inbox', syncInbox),
};
