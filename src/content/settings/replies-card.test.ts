import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { DEFAULT_REPLIES, type ReplyGroup } from '#content/game/chat-replies.ts';
import { buildRepliesCard } from './replies-card.ts';
import { currentSettings, updateSettings } from './settings.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(async () => {
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
  await updateSettings(settings => ({ ...settings, chatReplies: DEFAULT_REPLIES }));
});

afterEach(() => {
  document.body.innerHTML = '';
});

function newCard(): HTMLElement {
  const card = buildRepliesCard();
  document.body.append(card);
  return card;
}

const groupIn = (card: HTMLElement, group: ReplyGroup): HTMLElement => {
  const found = queryOne(card, `[data-ln-ext-group='${group}']`, HTMLElement);
  if (!found) throw new Error(`no ${group} group`);
  return found;
};

const fields = (card: HTMLElement, group: ReplyGroup): HTMLInputElement[] =>
  queryAll(groupIn(card, group), '.ln-ext-replies__row input', HTMLInputElement);

const shown = (card: HTMLElement, group: ReplyGroup): string[] =>
  fields(card, group).map(field => field.value);

const lichessChips = (card: HTMLElement, group: ReplyGroup): HTMLButtonElement[] =>
  queryAll(groupIn(card, group), '.ln-ext-replies__lichess-reply', HTMLButtonElement);

const rowButton = (
  card: HTMLElement,
  group: ReplyGroup,
  { index, action }: { index: number; action: string },
): HTMLButtonElement | null =>
  queryAll(groupIn(card, group), '.ln-ext-replies__row', HTMLElement)[index]?.querySelector(
    `[data-ln-ext-action='${action}']`,
  ) ?? null;

const newField = (card: HTMLElement, group: ReplyGroup): HTMLInputElement | null =>
  queryOne(groupIn(card, group), '.ln-ext-replies__new input', HTMLInputElement);

function type(field: HTMLInputElement | null, text: string): void {
  if (!field) return;
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

const press = (field: HTMLInputElement | null, key: string): void => {
  field?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

describe('the settings’ quick replies', () => {
  it('show Lichess’s at first, with nothing of theirs left out to put back', () => {
    const card = newCard();
    expect(shown(card, 'start')).toEqual(DEFAULT_REPLIES.start);
    expect(shown(card, 'end')).toEqual(DEFAULT_REPLIES.end);
    expect(groupIn(card, 'end').querySelector('.ln-ext-replies__count')?.textContent).toBe('5/5');
    expect(queryOne(card, '.ln-ext-replies__lichess', HTMLElement)?.hidden).toBe(true);
    expect(queryOne(card, "[data-ln-ext-action='reset']", HTMLButtonElement)?.disabled).toBe(true);
    expect(rowButton(card, 'start', { index: 0, action: 'up' })?.disabled).toBe(true);
    expect(rowButton(card, 'start', { index: 3, action: 'down' })?.disabled).toBe(true);
  });

  it('take one off, which Lichess’s chips then offer back', () => {
    const card = newCard();
    rowButton(card, 'end', { index: 1, action: 'remove' })?.click();
    expect(currentSettings().chatReplies.end).toEqual([
      'Good game',
      'Thank you',
      "I've got to go",
      'Bye!',
    ]);
    expect(shown(card, 'end')).toEqual(currentSettings().chatReplies.end);
    const chips = lichessChips(card, 'end');
    expect(chips.map(chip => chip.textContent)).toEqual(['Well played']);
    chips[0]?.click();
    expect(shown(card, 'end').at(-1)).toBe('Well played');
    expect(lichessChips(card, 'end')).toEqual([]);
  });

  it('move one up and down', () => {
    const card = newCard();
    rowButton(card, 'start', { index: 1, action: 'up' })?.click();
    expect(shown(card, 'start')).toEqual(['Good luck', 'Hello', 'Have fun!', 'You too!']);
    rowButton(card, 'start', { index: 1, action: 'down' })?.click();
    expect(currentSettings().chatReplies.start).toEqual([
      'Good luck',
      'Have fun!',
      'Hello',
      'You too!',
    ]);
  });

  it('add the user’s own on Enter, up to five', () => {
    const card = newCard();
    const field = newField(card, 'start');
    const add = queryOne(groupIn(card, 'start'), "[data-ln-ext-action='add']", HTMLButtonElement);
    expect(add?.disabled).toBe(true);
    type(field, ' Bonne partie ! ');
    expect(add?.disabled).toBe(false);
    press(field, 'Enter');
    expect(currentSettings().chatReplies.start.at(-1)).toBe('Bonne partie !');
    expect(field?.value).toBe('');
    expect(field?.disabled).toBe(true);
    expect(newField(card, 'end')?.disabled).toBe(true);
  });

  it('change one in place once its field is left, or put it back if it can’t be', () => {
    const card = newCard();
    const [first, second] = fields(card, 'end');
    if (!first || !second) throw new Error('no rows');
    first.value = 'GG';
    first.dispatchEvent(new Event('change', { bubbles: true }));
    expect(currentSettings().chatReplies.end[0]).toBe('GG');
    second.value = 'GG';
    second.dispatchEvent(new Event('change', { bubbles: true }));
    expect(second.value).toBe('Well played');
    expect(currentSettings().chatReplies.end[1]).toBe('Well played');
  });

  it('go back to Lichess’s', () => {
    const card = newCard();
    rowButton(card, 'start', { index: 0, action: 'remove' })?.click();
    const reset = queryOne(card, "[data-ln-ext-action='reset']", HTMLButtonElement);
    expect(reset?.disabled).toBe(false);
    reset?.click();
    expect(currentSettings().chatReplies).toEqual(DEFAULT_REPLIES);
    expect(shown(card, 'start')).toEqual(DEFAULT_REPLIES.start);
    expect(reset?.disabled).toBe(true);
  });

  it('say so when a list is empty', () => {
    const card = newCard();
    const empty = queryOne(groupIn(card, 'start'), '.ln-ext-replies__empty', HTMLElement);
    expect(empty?.hidden).toBe(true);
    for (let i = 0; i < 4; i++) rowButton(card, 'start', { index: 0, action: 'remove' })?.click();
    expect(shown(card, 'start')).toEqual([]);
    expect(empty?.hidden).toBe(false);
    expect(lichessChips(card, 'start')).toHaveLength(4);
  });
});
