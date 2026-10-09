import { isParsing, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { translate } from '#page/lichess/globals.ts';
import { chatEvent } from './events.ts';

// Marks each line of a chat for its bubbles (styles/chat): whose it is, whether it
// follows or is followed by one of the same author's, and which game event a system
// line reports, with that event's words in the page's language.

// An anonymous player's lines carry their color, not `.me`: the board is turned to it.
function isMine(line: HTMLElement, author: string | null): boolean {
  if (line.classList.contains('me')) return true;
  if (!author?.startsWith('[')) return false;
  const board = queryOne(document, 'main.round .cg-wrap', HTMLElement);
  return board?.classList.contains(`orientation-${author.slice(1, -1)}`) ?? false;
}

function authorOf(line: HTMLElement): string | null {
  if (line.classList.contains('system')) return null;
  return line.querySelector(':scope > .user-link, :scope > .color')?.textContent.trim() ?? null;
}

function markEvent(line: HTMLElement): void {
  const text = line.querySelector(':scope > t')?.textContent ?? '';
  const found = line.classList.contains('system') ? chatEvent(text) : null;
  setData(line, 'lrExtTopic', found?.topic ?? null);
  setData(line, 'lrExtTone', found?.tone ?? null);
  setData(line, 'lrExtLabel', found ? translate(found.key ?? '', text.trim()) : null);
}

function markLines(chat: HTMLElement): void {
  const list = queryOne(chat, '.mchat__messages', HTMLElement);
  if (!list) return;
  const lines = queryAll(list, ':scope > li', HTMLElement);
  const authors = lines.map(authorOf);
  for (const [i, line] of lines.entries()) {
    const author = authors[i] ?? null;
    setData(line, 'lrExtMine', isMine(line, author) ? '' : null);
    setData(line, 'lrExtFollows', author !== null && authors[i - 1] === author ? '' : null);
    setData(line, 'lrExtFollowed', author !== null && authors[i + 1] === author ? '' : null);
    markEvent(line);
  }
}

const LINES = { childList: true, subtree: true, characterData: true };

// Lichess replaces the page's empty `.mchat` with the chat it draws (on analysis pages, a
// `.mchat-optional`): the parent tells when, and the new one is watched instead.
function watch(found: HTMLElement): void {
  let chat = found;
  const lines = new MutationObserver(() => markLines(chat));
  const follow = (next: HTMLElement): void => {
    chat = next;
    lines.disconnect();
    lines.observe(chat, LINES);
    markLines(chat);
  };
  follow(found);
  const parent = found.parentElement;
  if (!parent) return;
  new MutationObserver(() => {
    const current = queryOne(parent, ':scope > .mchat', HTMLElement);
    if (current && current !== chat) follow(current);
  }).observe(parent, { childList: true });
}

export const chat: Feature = {
  name: 'chat',
  start: () =>
    pollUntil(() => queryOne(document, '.mchat', HTMLElement), watch, {
      intervalMs: 300,
      giveUpMs: 20_000,
      worthWaiting: () => isParsing() || document.querySelector('main') !== null,
    }),
};
