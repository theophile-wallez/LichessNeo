import { isParsing, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { translate } from '#page/lichess/globals.ts';
import { chatEvent, eventKey, type ChatEvent, type Offerer } from './events.ts';

// Marks each line of a chat for its bubbles (styles/chat): whose it is, whether it
// follows one of the same author's, and which game event a system line reports, with
// that event's words in the page's language.

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

// Lichess's rematch button says whose offer is pending: `glowing` for the opponent's, `me`
// for the player's (lila's ui/round view/button.ts).
function pendingRematch(): Offerer | null {
  const button = queryOne(document, 'main.round .rcontrols .rematch', HTMLElement);
  if (button?.classList.contains('glowing')) return 'opponent';
  return button?.classList.contains('me') ? 'me' : null;
}

const isRematchOffer = (found: ChatEvent | null): boolean =>
  found?.topic === 'rematch' && found.tone === 'offer';

// Only the latest offer can be the pending one. Once known, whose it is stays on the line:
// the button forgets once the offer is answered.
function offererOf(line: HTMLElement, latestOffer: boolean): Offerer | null {
  const kept = line.dataset['lnExtOfferer'];
  if (kept === 'me' || kept === 'opponent') return kept;
  const pending = latestOffer ? pendingRematch() : null;
  setData(line, 'lnExtOfferer', pending);
  return pending;
}

function markEvent(line: HTMLElement, found: ChatEvent | null, latestOffer: boolean): void {
  const text = line.querySelector(':scope > t')?.textContent.trim() ?? '';
  const offerer = isRematchOffer(found) ? offererOf(line, latestOffer) : null;
  setData(line, 'lnExtTopic', found?.topic ?? null);
  setData(line, 'lnExtTone', found?.tone ?? null);
  setData(line, 'lnExtLabel', found ? translate(eventKey(found, offerer) ?? '', text) : null);
}

const eventOf = (line: HTMLElement): ChatEvent | null =>
  line.classList.contains('system')
    ? chatEvent(line.querySelector(':scope > t')?.textContent ?? '')
    : null;

function markLines(chat: HTMLElement): void {
  const list = queryOne(chat, '.mchat__messages', HTMLElement);
  if (!list) return;
  const lines = queryAll(list, ':scope > li', HTMLElement);
  const authors = lines.map(authorOf);
  const events = lines.map(eventOf);
  const latestOffer = events.findLastIndex(isRematchOffer);
  for (const [i, line] of lines.entries()) {
    const author = authors[i] ?? null;
    setData(line, 'lnExtMine', isMine(line, author) ? '' : null);
    setData(line, 'lnExtFollows', author !== null && authors[i - 1] === author ? '' : null);
    markEvent(line, events[i] ?? null, i === latestOffer);
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
  // The rematch button may learn whose offer it is after the chat shows the offer.
  const controls = queryOne(document, 'main.round .rcontrols', HTMLElement);
  if (controls) {
    new MutationObserver(() => markLines(chat)).observe(controls, {
      subtree: true,
      childList: true,
      attributeFilter: ['class'],
    });
  }
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
