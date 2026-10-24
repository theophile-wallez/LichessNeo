import { queryAll, queryOne } from '#shared/dom.ts';
import type { SimulClock } from './clock.ts';

// What the simul form holds, read off Lichess's own fields by their names, which don't
// change with the page's language.

export interface SimulFormState {
  readonly name: string;
  /** The word Lichess writes after the name field ("Simul"), in the page's language. */
  readonly suffix: string;
  /** The variants picked, as their labels. */
  readonly variants: readonly string[];
  readonly color: string;
  readonly colorText: string;
  readonly clock: SimulClock;
  /** The entry conditions set, as their options read. */
  readonly conditions: readonly string[];
  /** A condition's option for none ("No restriction"). */
  readonly noRestriction: string;
  /** The estimated start, as its picker shows it, or empty. */
  readonly start: string;
}

const fieldSelect = (form: HTMLFormElement, name: string): HTMLSelectElement | null =>
  queryOne(form, `select[name='${name}']`, HTMLSelectElement);

const selectNumber = (form: HTMLFormElement, name: string): number => {
  const value = Number(fieldSelect(form, name)?.value);
  return Number.isFinite(value) ? value : 0;
};

const pickedText = (select: HTMLSelectElement | null): string =>
  (select && select.options[select.selectedIndex]?.textContent.trim()) ?? '';

/** The name field's box: its input, the word after it, its help. */
export const nameBox = (form: HTMLFormElement): HTMLElement | null =>
  queryOne(form, "input[name='name']", HTMLInputElement)?.parentElement ?? null;

export function nameSuffix(form: HTMLFormElement): string {
  const box = nameBox(form);
  if (!box) return '';
  const texts = [...box.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
  return texts
    .map(node => node.textContent ?? '')
    .join(' ')
    .trim();
}

function pickedVariants(form: HTMLFormElement): string[] {
  return queryAll(form, ".variants input[type='checkbox']:checked", HTMLInputElement).flatMap(
    input => {
      const label = queryOne(form, `label[for='${input.id}']:not(.form-check__label)`, HTMLElement);
      const text = label?.textContent.trim();
      return text ? [text] : [];
    },
  );
}

// flatpickr hides the field and shows a copy that reads as the user's locale.
function startText(form: HTMLFormElement): string {
  const shown = queryOne(form, 'input.flatpickr:not([type=hidden])', HTMLInputElement);
  const field = shown ?? queryOne(form, "input[name='estimatedStartAt']", HTMLInputElement);
  return field?.value.trim() ?? '';
}

export function readForm(form: HTMLFormElement): SimulFormState {
  const conditions = queryAll(form, "select[name^='conditions.']", HTMLSelectElement);
  const color = fieldSelect(form, 'color');
  return {
    name: queryOne(form, "input[name='name']", HTMLInputElement)?.value.trim() ?? '',
    suffix: nameSuffix(form),
    variants: pickedVariants(form),
    color: color?.value ?? '',
    colorText: pickedText(color),
    clock: {
      minutes: selectNumber(form, 'clockTime'),
      increment: selectNumber(form, 'clockIncrement'),
      hostExtra: selectNumber(form, 'clockExtra'),
      hostPerPlayer: selectNumber(form, 'clockExtraPerPlayer'),
    },
    conditions: conditions.filter(select => select.value !== '').map(pickedText),
    noRestriction: conditions[0]?.options[0]?.textContent.trim() ?? '',
    start: startText(form),
  };
}
