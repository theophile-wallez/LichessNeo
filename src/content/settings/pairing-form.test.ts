import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { pickSelectedOptions } from '#shared/testing/selects.ts';
import {
  addClock,
  fillForm,
  formMarkup,
  madeCard,
  NEW_CARD,
  showClockButtons,
} from './pairing-form.ts';

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

function newForm(): HTMLFormElement {
  const holder = createElement('div');
  setHtml(holder, formMarkup());
  const form = queryOne(holder, 'form', HTMLFormElement);
  if (!form) throw new Error('no form');
  pickSelectedOptions(form);
  return form;
}

const select = (form: HTMLFormElement, name: string, index = 0): HTMLSelectElement => {
  const found = queryAll(form, `select[name='${name}']`, HTMLSelectElement)[index];
  if (!found) throw new Error(`no ${name} menu`);
  return found;
};

const clocks = (form: HTMLFormElement): string[] =>
  queryAll(form, '.ln-ext-pairing__clock', HTMLElement).map(
    (_, index) =>
      `${select(form, 'minutes', index).value}+${select(form, 'increment', index).value}`,
  );

const shown = (form: HTMLFormElement, selector: string): boolean[] =>
  queryAll(form, selector, HTMLButtonElement).map(button => !button.hidden);

describe('the Quick pairing form', () => {
  it('starts with a card of its own: Standard, rated, one time control', () => {
    const form = newForm();
    expect(madeCard(form)).toEqual(NEW_CARD);
    expect(NEW_CARD).toEqual({
      variant: 'standard',
      rated: true,
      clocks: [{ minutes: 3, increment: 1 }],
    });
  });

  it('makes the card picked, a time control picked twice kept once', () => {
    const form = newForm();
    select(form, 'variant').value = 'atomic';
    select(form, 'mode').value = 'casual';
    addClock(form);
    addClock(form);
    pickSelectedOptions(form);
    select(form, 'minutes', 2).value = '3';
    select(form, 'increment', 2).value = '1';
    expect(madeCard(form)).toEqual({
      variant: 'atomic',
      rated: false,
      clocks: [
        { minutes: 3, increment: 1 },
        { minutes: 5, increment: 0 },
      ],
    });
  });

  it('makes no card of a clock with no time at all', () => {
    const form = newForm();
    select(form, 'minutes').value = '0';
    select(form, 'increment').value = '0';
    expect(madeCard(form)).toBeNull();
  });

  it('adds a time control the form doesn’t have yet, up to four', () => {
    const form = newForm();
    select(form, 'minutes').value = '5';
    select(form, 'increment').value = '0';
    for (let i = 0; i < 5; i++) {
      addClock(form);
      pickSelectedOptions(form);
    }
    expect(clocks(form)).toEqual(['5+0', '3+1', '10+0', '1+0']);
  });

  it('offers another row while there’s room, and a cross on each while there are two', () => {
    const form = newForm();
    showClockButtons(form);
    expect(shown(form, "[data-ln-ext-action='add-clock']")).toEqual([true]);
    expect(shown(form, "[data-ln-ext-action='remove-clock']")).toEqual([false]);
    addClock(form);
    showClockButtons(form);
    expect(shown(form, "[data-ln-ext-action='remove-clock']")).toEqual([true, true]);
    addClock(form);
    addClock(form);
    showClockButtons(form);
    expect(shown(form, "[data-ln-ext-action='add-clock']")).toEqual([false]);
  });

  it('takes in a card to change, a row per time control', () => {
    const form = newForm();
    const card = {
      variant: 'crazyhouse' as const,
      rated: false,
      clocks: [
        { minutes: 1, increment: 0 },
        { minutes: 2, increment: 1 },
        { minutes: 0.5, increment: 0 },
      ],
    };
    fillForm(form, card);
    pickSelectedOptions(form);
    expect(clocks(form)).toEqual(['1+0', '2+1', '0.5+0']);
    expect(madeCard(form)).toEqual(card);
    fillForm(form, NEW_CARD);
    pickSelectedOptions(form);
    expect(madeCard(form)).toEqual(NEW_CARD);
  });
});
