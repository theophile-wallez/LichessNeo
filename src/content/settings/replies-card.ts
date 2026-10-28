import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import {
  DEFAULT_REPLIES,
  MAX_REPLIES,
  moved,
  REPLY_GROUPS,
  withEdited,
  withReply,
  type ReplyGroup,
} from '#content/game/chat-replies.ts';
import { leftOut, lichessReplyMarkup, replyMarkup, repliesMarkup } from './replies-markup.ts';
import { currentSettings, onSettings, updateSettings, type Settings } from './settings.ts';

// The settings' quick replies, on the Play page: the chat's messages at a game's start and at
// its end (content/game/chat-presets.ts), Lichess's to begin with, to reorder, change, take off
// and add to, five at most each.

const ROWS = '.ln-ext-pairing__rows';
const NEW = '.ln-ext-replies__new input';

const listOf = (group: ReplyGroup): string[] => currentSettings().chatReplies[group];

const save = (group: ReplyGroup, list: string[]): Promise<void> =>
  updateSettings(settings => ({
    ...settings,
    chatReplies: { ...settings.chatReplies, [group]: list },
  }));

function groupOf(target: EventTarget | null): ReplyGroup | null {
  const name = closestTo(target, '.ln-ext-replies__group', HTMLElement)?.dataset.lnExtGroup;
  return REPLY_GROUPS.find(group => group === name) ?? null;
}

/** The place in its list of the reply whose row holds `target`; -1 for none. */
function indexOf(target: EventTarget | null): number {
  const row = closestTo(target, '.ln-ext-replies__row', HTMLElement);
  const rows = row?.parentElement;
  return row && rows ? [...rows.children].indexOf(row) : -1;
}

function setDisabled(button: HTMLButtonElement | HTMLInputElement | null, disabled: boolean): void {
  if (button && button.disabled !== disabled) button.disabled = disabled;
}

function setHidden(element: HTMLElement | null, hidden: boolean): void {
  if (element && element.hidden !== hidden) element.hidden = hidden;
}

// The rows are drawn again only when there are more or fewer: a reply changed or moved is
// written into its field, so a click on a row's button never lands on a row redrawn under it.
function drawRows(element: HTMLElement, list: readonly string[]): void {
  const rows = queryOne(element, ROWS, HTMLElement);
  if (!rows) return;
  if (rows.children.length !== list.length) setHtml(rows, html`${list.map(replyMarkup)}`);
  for (const [index, row] of queryAll(rows, ':scope > li', HTMLElement).entries()) {
    const input = queryOne(row, 'input', HTMLInputElement);
    const text = list[index] ?? '';
    if (input && input.value !== text && document.activeElement !== input) input.value = text;
    const button = (name: string): HTMLButtonElement | null =>
      queryOne(row, `[data-ln-ext-action='${name}']`, HTMLButtonElement);
    setDisabled(button('up'), index === 0);
    setDisabled(button('down'), index === list.length - 1);
  }
}

function drawLichess(element: HTMLElement, group: ReplyGroup, list: readonly string[]): void {
  const holder = queryOne(element, '.ln-ext-replies__lichess-list', HTMLElement);
  if (!holder) return;
  const missing = leftOut(group, list);
  const signature = missing.join('\n');
  if (holder.dataset.lnExtReplies !== signature) {
    setData(holder, 'lnExtReplies', signature);
    setHtml(holder, html`${missing.map(lichessReplyMarkup)}`);
  }
  setHidden(holder.parentElement, missing.length === 0);
  const full = list.length >= MAX_REPLIES;
  for (const chip of queryAll(holder, 'button', HTMLButtonElement)) setDisabled(chip, full);
}

function drawNew(element: HTMLElement, full: boolean): void {
  const input = queryOne(element, NEW, HTMLInputElement);
  setDisabled(input, full);
  const add = queryOne(element, "[data-ln-ext-action='add']", HTMLButtonElement);
  setDisabled(add, full || !input?.value.trim());
}

function drawGroup(card: HTMLElement, group: ReplyGroup, list: readonly string[]): void {
  const element = queryOne(
    card,
    `.ln-ext-replies__group[data-ln-ext-group='${group}']`,
    HTMLElement,
  );
  if (!element) return;
  drawRows(element, list);
  drawLichess(element, group, list);
  drawNew(element, list.length >= MAX_REPLIES);
  setHidden(queryOne(element, '.ln-ext-replies__empty', HTMLElement), list.length > 0);
  const count = queryOne(element, '.ln-ext-replies__count', HTMLElement);
  const text = `${list.length}/${MAX_REPLIES}`;
  if (count && count.textContent !== text) count.textContent = text;
}

function draw(card: HTMLElement, { chatReplies }: Settings): void {
  for (const group of REPLY_GROUPS) drawGroup(card, group, chatReplies[group]);
  const reset = queryOne(card, "[data-ln-ext-action='reset']", HTMLButtonElement);
  setDisabled(reset, JSON.stringify(chatReplies) === JSON.stringify(DEFAULT_REPLIES));
}

function add(card: HTMLElement, group: ReplyGroup): void {
  const input = queryOne(card, `[data-ln-ext-group='${group}'] ${NEW}`, HTMLInputElement);
  const next = input && withReply(listOf(group), input.value);
  if (!input || !next) return;
  input.value = '';
  void save(group, next);
}

// The list once the button `name` is clicked in `group`; null if it doesn't change.
function actedOn(name: string, group: ReplyGroup, target: Element): string[] | null {
  const list = listOf(group);
  const index = indexOf(target);
  if (name === 'up' || name === 'down') return moved(list, index, name === 'up' ? -1 : 1);
  if (name === 'remove') return list.filter((_, at) => at !== index);
  const text = closestTo(target, '[data-ln-ext-text]', HTMLElement)?.dataset.lnExtText;
  return name === 'restore' && text !== undefined ? withReply(list, text) : null;
}

function onClick(card: HTMLElement, event: MouseEvent): void {
  const button = closestTo(event.target, '[data-ln-ext-action]', HTMLButtonElement);
  const name = button?.dataset.lnExtAction;
  if (!button || button.disabled || !name) return;
  if (name === 'reset') {
    void updateSettings(settings => ({ ...settings, chatReplies: DEFAULT_REPLIES }));
    return;
  }
  const group = groupOf(button);
  if (!group) return;
  if (name === 'add') return add(card, group);
  const next = actedOn(name, group, button);
  if (next) void save(group, next);
}

// A reply changed in place: kept once its field is left; put back if it's emptied or another's.
function onChange(event: Event): void {
  const input = event.target;
  const group = groupOf(input);
  const index = indexOf(input);
  if (!(input instanceof HTMLInputElement) || !group || index < 0) return;
  const list = listOf(group);
  const next = withEdited(list, index, input.value);
  if (next) void save(group, next);
  else input.value = list[index] ?? '';
}

function onKeydown(card: HTMLElement, event: KeyboardEvent): void {
  const input = event.target;
  const group = groupOf(input);
  if (event.key !== 'Enter' || !(input instanceof HTMLInputElement) || !group) return;
  event.preventDefault();
  if (indexOf(input) < 0) add(card, group);
  else input.blur();
}

/** The card, kept in step with the settings. */
export function buildRepliesCard(): HTMLElement {
  const card = createElement('section', { className: 'ln-ext-pairing ln-ext-replies' });
  setHtml(card, repliesMarkup());
  card.addEventListener('click', event => onClick(card, event));
  card.addEventListener('change', onChange);
  card.addEventListener('keydown', event => onKeydown(card, event));
  card.addEventListener('input', () => draw(card, currentSettings()));
  draw(card, currentSettings());
  onSettings(settings => draw(card, settings));
  return card;
}
