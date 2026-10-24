import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { pickSelectedOptions } from '#shared/testing/selects.ts';
import { SIMUL_FORM } from '#shared/testing/simul-form.ts';

// Our messages as their names, the substitutions after them.
const getMessage = (name: string, substitutions: string[] = []): string =>
  [name, ...substitutions].join(' ');

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

async function start(): Promise<HTMLFormElement> {
  document.body.innerHTML = `<span id="user_tag">Ada</span>${SIMUL_FORM}`;
  pickSelectedOptions(document);
  const { syncSimulForm } = await import('./index.ts');
  syncSimulForm();
  syncSimulForm();
  const form = queryOne(document, 'main.simul-form > form', HTMLFormElement);
  if (!form) throw new Error('no form');
  return form;
}

const text = (selector: string): string =>
  queryOne(document, selector, HTMLElement)?.textContent ?? '';

const summary = (row: string): string => text(`[data-ln-ext-row='${row}'] dd`);

function pick(form: HTMLFormElement, name: string, value: string): void {
  const select = queryOne(form, `select[name='${name}']`, HTMLSelectElement);
  if (!select) throw new Error(`no ${name}`);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('the simul form', () => {
  it('marks its parts and variants for the stylesheet, once', async () => {
    const form = await start();
    const parts = queryAll(form, '[data-ln-ext-part]', HTMLElement).map(
      part => part.dataset['lnExtPart'],
    );
    expect(parts).toEqual([
      'intro',
      'name',
      'games',
      'clock',
      'entry',
      'start',
      'description',
      'actions',
    ]);
    const variants = queryAll(form, '.checkable', HTMLElement).map(
      tile => tile.dataset['lnExtVariant'],
    );
    expect(variants).toEqual(['standard', 'crazyhouse', 'chess960', 'atomic']);
    expect(queryAll(document, '.ln-ext-simul-form__aside', HTMLElement)).toHaveLength(1);
  });

  // Lichess writes "Simul" after the name field as bare text, which no rule can reach.
  it('puts the word after the name where the stylesheet can draw it', async () => {
    const form = await start();
    expect(queryOne(form, '[data-ln-ext-suffix]', HTMLElement)?.dataset['lnExtSuffix']).toBe(
      'Simul',
    );
  });

  it('starts the name’s card and the details’ with heads of their own', async () => {
    const form = await start();
    const heads = queryAll(form, '.ln-ext-simul-form__head', HTMLElement);
    expect(heads.map(head => [head.dataset['lnExtCard'], head.textContent])).toEqual([
      ['games', 'Games'],
      ['details', 'simulFormDetails'],
    ]);
    expect(heads[0]?.nextElementSibling).toBe(
      queryOne(form, "[data-ln-ext-part='name']", HTMLElement),
    );
  });

  it('shows the simul’s card as the list will', async () => {
    const form = await start();
    expect(text('.ln-ext-simul-form__card-name')).toBe('Ada Simul');
    expect(text('.ln-ext-simul-form__card-meta')).toBe('20+60 • Standard');
    const chess960 = queryOne(form, '#setup-variants-2', HTMLInputElement);
    chess960?.click();
    expect(text('.ln-ext-simul-form__card-meta')).toBe('20+60 • Standard, Chess960');
  });

  it('sets the host’s color through Lichess’s select', async () => {
    const form = await start();
    const black = queryOne(form, "[data-ln-ext-color='black']", HTMLButtonElement);
    black?.click();
    expect(queryOne(form, "select[name='color']", HTMLSelectElement)?.value).toBe('black');
    expect(black?.getAttribute('aria-checked')).toBe('true');
    expect(summary('color')).toBe('Black');
  });

  it('shows the host’s time, with what each player who joins adds', async () => {
    const form = await start();
    expect(text('.ln-ext-simul-form__chip')).toBe('20+60');
    expect(text('.ln-ext-simul-form__host-time')).toBe('20 min');
    expect(text('.ln-ext-simul-form__host-note')).toBe('simulFormClockAlone');
    pick(form, 'clockExtra', '10');
    pick(form, 'clockExtraPerPlayer', '30');
    expect(text('.ln-ext-simul-form__host-time')).toBe('45 min');
    expect(text('.ln-ext-simul-form__host-note')).toBe('simulFormClockWith 30');
    expect(summary('clock')).toBe('simulFormPerPlayer 30 min 30 sec');
  });

  it('sums up the entry conditions set', async () => {
    const form = await start();
    expect(summary('entry')).toBe('No restriction');
    pick(form, 'conditions.maxRating.rating', '2000');
    expect(summary('entry')).toBe('Maximum rating of 2000');
    pick(form, 'conditions.accountAge', '7');
    expect(summary('entry')).toBe('simulFormConditions 2');
  });

  it('shows the start once one is picked', async () => {
    const form = await start();
    const row = queryOne(document, "[data-ln-ext-row='start']", HTMLElement);
    expect(row?.hidden).toBe(true);
    const shown = queryOne(form, 'input.flatpickr:not([type=hidden])', HTMLInputElement);
    const field = queryOne(form, "input[name='estimatedStartAt']", HTMLInputElement);
    if (!shown || !field) throw new Error('no start');
    shown.value = '2026-10-30 12:00';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    expect(row?.hidden).toBe(false);
    expect(summary('start')).toBe('2026-10-30 12:00');
  });

  it('submits through Lichess’s own button', async () => {
    const form = await start();
    const clicked = vi.fn<(event: Event) => void>(event => event.preventDefault());
    queryOne(form, "button[type='submit']", HTMLButtonElement)?.addEventListener('click', clicked);
    queryOne(document, '.ln-ext-simul-form__submit', HTMLButtonElement)?.click();
    expect(clicked).toHaveBeenCalledOnce();
    expect(text('.ln-ext-simul-form__submit')).toBe('Host a new simul');
  });
});
