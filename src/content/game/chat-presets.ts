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
import { currentSettings } from '#content/settings/settings.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { groupOf, type ReplyGroup } from './chat-replies.ts';

// The chat's quick replies, the user's own (settings' Play page) in place of Lichess's, when
// Lichess shows its own: at a game's start in the chat, under its input; at its end in a row
// under the game over's card, as the chat is behind its tab (styles/game/chat-presets.css).
// Lichess's chips only say which group is due: ours send through the chat's input.

const ROW = 'ln-ext-chat-presets';
const CHAT = 'main.round .round__side > .mchat';
const WIDE = '(min-width: 1020px)';

const chatInput = (): HTMLInputElement | null => {
  const input = queryOne(document, `${CHAT} input.mchat__say`, HTMLInputElement);
  return input && !input.disabled ? input : null;
};

// lila sends what the input holds on Enter (ui/lib/src/chat/discussion.ts), then empties it on a
// timeout of its own: a draft the player was typing comes back after.
function say(input: HTMLInputElement, text: string): void {
  const draft = input.value;
  input.value = text;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  if (!draft) return;
  setTimeout(() => {
    input.value = draft;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function onRowClick(event: MouseEvent): void {
  const text = closestTo(event.target, `.${ROW}__reply`, HTMLButtonElement)?.dataset['lnExtText'];
  const input = chatInput();
  if (!text || !input) return;
  say(input, text);
  if (!closestTo(event.target, '.follow-up', HTMLElement)) return;
  showPanelPart('chat');
  // Below 1020px the chat is no tab but further down the column.
  const chat = queryOne(document, CHAT, HTMLElement);
  if (chat && !matchMedia(WIDE).matches) centerInScroller(chat);
}

// A mouse's wheel scrolls the row sideways, when it doesn't fit.
function onRowWheel(event: WheelEvent): void {
  const row = event.currentTarget;
  if (!(row instanceof HTMLElement) || row.scrollWidth <= row.clientWidth) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  row.scrollLeft += event.deltaY;
}

function buildRow(): HTMLElement {
  const row = createElement('div', { className: ROW });
  row.addEventListener('click', onRowClick);
  row.addEventListener('wheel', onRowWheel, { passive: false });
  return row;
}

/** Draws the replies again only when they changed: in the settings, or from a game's start to its end. */
function drawReplies(row: HTMLElement, group: ReplyGroup, replies: readonly string[]): void {
  const signature = JSON.stringify([group, replies]);
  if (row.dataset['lnExtReplies'] === signature) return;
  setData(row, 'lnExtReplies', signature);
  row.replaceChildren(
    ...replies.map(text =>
      createElement('button', {
        className: `${ROW}__reply`,
        text,
        // The title shows a reply cut short whole; it turns into our tooltip (content/ui).
        attrs: { type: 'button', title: text, 'data-ln-ext-text': text },
      }),
    ),
  );
}

// At the end, before Lichess's buttons, whose analysis link must stay the last
// (page/game-over/chips.ts); otherwise just after Lichess's own row.
function place(row: HTMLElement, followUp: HTMLElement | null, presets: HTMLElement): void {
  if (followUp) {
    if (row.parentElement !== followUp) followUp.prepend(row);
  } else if (presets.nextElementSibling !== row) presets.after(row);
}

export function syncChatPresets(): void {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) return;
  const existing = queryOne(main, `.${ROW}`, HTMLElement);
  // Lichess shows none to a spectator, nor in the middle of a game.
  const presets = queryOne(main, '.round__side > .mchat .mchat__presets', HTMLElement);
  const keys = presets ? queryAll(presets, ':scope > span', HTMLElement) : [];
  const group = groupOf(keys.map(key => key.textContent.trim()));
  setData(main, 'lnExtChatPresets', group ? '' : null);
  // Unlike Lichess's, ours all stay once said, for as long as the group is due.
  const replies = group && chatInput() ? currentSettings().chatReplies[group] : [];
  if (!presets || !group || replies.length === 0) {
    existing?.remove();
    return;
  }
  const row = existing ?? buildRow();
  place(row, queryOne(main, '.rcontrols .follow-up', HTMLElement), presets);
  drawReplies(row, group, replies);
}

export const chatPresets: Feature = {
  name: 'chat presets',
  start: () => onEveryTick('chat presets', syncChatPresets),
};
