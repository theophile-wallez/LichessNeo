import Add01Icon from '@hugeicons/core-free-icons/Add01Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import {
  lichessReplies,
  MAX_REPLIES,
  MAX_REPLY_LENGTH,
  REPLY_GROUPS,
  type ReplyGroup,
} from '#content/game/chat-replies.ts';

// The markup of the settings' quick replies, on the Play page, in the quick pairing's look
// (styles/pages/settings-pairing.css, settings-replies.css): for a game's start and for its end,
// the replies in their order, each to change in place, move or take off; a field for one of the
// user's own; and Lichess's own that the list left out, to put back.

const GROUP_NAMES: Readonly<Record<ReplyGroup, string>> = {
  start: 'repliesStart',
  end: 'repliesEnd',
};

const action = (name: string, icon: SafeHtml, label: string): SafeHtml =>
  html`<button type="button" class="ln-ext-pairing__action" data-ln-ext-action="${name}" title="${label}" aria-label="${label}">${icon}</button>`;

/** A reply: its words, to change in place, and its buttons. */
export const replyMarkup = (text: string): SafeHtml =>
  html`<li class="ln-ext-pairing__row ln-ext-replies__row">
    <input type="text" class="ln-ext-replies__text" value="${text}" maxlength="${String(MAX_REPLY_LENGTH)}" aria-label="${message('repliesMessage')}" />
    <span class="ln-ext-pairing__actions">
      ${action('up', hugeicon(ArrowUp01Icon), message('repliesMoveUp'))}
      ${action('down', hugeicon(ArrowDown01Icon), message('repliesMoveDown'))}
      ${action('remove', hugeicon(Delete02Icon), message('repliesRemove'))}
    </span>
  </li>`;

/** Lichess's reply `text`, which the list left out, as a chip that puts it back. */
export const lichessReplyMarkup = (text: string): SafeHtml =>
  html`<button type="button" class="ln-ext-replies__lichess-reply" data-ln-ext-action="restore" data-ln-ext-text="${text}">${hugeicon(Add01Icon)}<span>${text}</span></button>`;

const groupMarkup = (group: ReplyGroup): SafeHtml =>
  html`<div class="ln-ext-replies__group" data-ln-ext-group="${group}">
    <h3 class="ln-ext-replies__label">${message(GROUP_NAMES[group])}<span class="ln-ext-replies__count"></span></h3>
    <ul class="ln-ext-pairing__rows"></ul>
    <p class="ln-ext-pairing__note ln-ext-replies__empty">${message('repliesEmpty')}</p>
    <div class="ln-ext-replies__new">
      <input type="text" class="ln-ext-replies__text" maxlength="${String(MAX_REPLY_LENGTH)}" placeholder="${message('repliesPlaceholder')}" aria-label="${message('repliesPlaceholder')}" />
      <button type="button" class="ln-ext-pairing__add" data-ln-ext-action="add">${hugeicon(Add01Icon)}<span>${message('repliesAdd')}</span></button>
    </div>
    <div class="ln-ext-replies__lichess">
      <span class="ln-ext-replies__lichess-label">${message('repliesLichess')}</span>
      <span class="ln-ext-replies__lichess-list"></span>
    </div>
  </div>`;

/** The card's content, its lists drawn into each group's `.ln-ext-pairing__rows`. */
export const repliesMarkup = (): SafeHtml =>
  html`<div class="ln-ext-pairing__head">
      <span class="ln-ext-setting__icon" aria-hidden="true"></span>
      <div class="ln-ext-setting__text">
        <h2 class="ln-ext-setting__title">${message('repliesTitle')}</h2>
        <p class="ln-ext-setting__body">${message('repliesBody', String(MAX_REPLIES))}</p>
      </div>
      <button type="button" class="ln-ext-pairing__reset" data-ln-ext-action="reset">${message('repliesReset')}</button>
    </div>
    ${REPLY_GROUPS.map(groupMarkup)}`;

/** Lichess's replies of `group` that `list` left out. */
export const leftOut = (group: ReplyGroup, list: readonly string[]): string[] =>
  lichessReplies(group).filter(text => !list.includes(text));
