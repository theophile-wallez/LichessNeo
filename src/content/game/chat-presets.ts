import {
  centerInScroller,
  closestTo,
  createElement,
  queryAll,
  queryOne,
  setData,
} from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { showPanelPart } from '#content/layout/panel-tabs.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess's quick replies at a game's end ("Good game", "Well played"…) are in the chat, which
// the panel keeps behind its tab: a row of them under the game over's card
// (styles/game/chat-presets.css). A click goes to Lichess's own reply, which sends it, and the
// chat opens to show it.

const ROW = 'ln-ext-chat-presets';
const CHAT = 'main.round .round__side > .mchat';
const WIDE = '(min-width: 1020px)';

/** Lichess's replies not yet said: a span each, its key ("gg") as its text, its words as its title. */
const lichessReplies = (): HTMLElement[] =>
  queryAll(document, `${CHAT} .mchat__presets > span:not(.disabled)`, HTMLElement);

const replyKey = (reply: HTMLElement): string => reply.textContent.trim();

function onRowClick(event: MouseEvent): void {
  const button = closestTo(event.target, `.${ROW}__reply`, HTMLButtonElement);
  const key = button?.dataset['lnExtReply'];
  const reply = lichessReplies().find(one => replyKey(one) === key);
  if (!reply) return;
  reply.click();
  showPanelPart('chat');
  // Below 1020px the chat is no tab but further down the column.
  const chat = queryOne(document, CHAT, HTMLElement);
  if (chat && !matchMedia(WIDE).matches) centerInScroller(chat);
}

function buildRow(): HTMLElement {
  const row = createElement('div', { className: ROW });
  row.addEventListener('click', onRowClick);
  return row;
}

/** Draws the replies again only when they changed: Lichess takes away each one said. */
function drawReplies(row: HTMLElement, replies: readonly HTMLElement[]): void {
  const signature = replies.map(replyKey).join(' ');
  if (row.dataset['lnExtReplies'] === signature) return;
  setData(row, 'lnExtReplies', signature);
  row.replaceChildren(
    ...replies.map(reply =>
      createElement('button', {
        className: `${ROW}__reply`,
        text: reply.title,
        attrs: { type: 'button', 'data-ln-ext-reply': replyKey(reply) },
      }),
    ),
  );
}

export function syncChatPresets(): void {
  const main = queryOne(document, 'main.round', HTMLElement);
  const followUp = main && queryOne(main, '.rcontrols .follow-up', HTMLElement);
  if (!main || !followUp) return;
  const existing = queryOne(followUp, `:scope > .${ROW}`, HTMLElement);
  // Lichess shows none to a spectator, nor once two are said.
  const replies = lichessReplies();
  // Ours take the place of Lichess's own, under the chat's input.
  setData(main, 'lnExtChatPresets', replies.length > 0 ? '' : null);
  if (replies.length === 0) {
    existing?.remove();
    return;
  }
  // Before Lichess's buttons, whose analysis link must stay the last (page/game-over/chips.ts).
  const row = existing ?? buildRow();
  if (!existing) followUp.prepend(row);
  drawReplies(row, replies);
}

export const chatPresets: Feature = {
  name: 'chat presets',
  start: () => onEveryTick('chat presets', syncChatPresets),
};
