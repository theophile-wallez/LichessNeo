import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';
import { nameBox, nameSuffix } from './read.ts';

// The form's parts, marked for styles/simul/form.css to lay them out as cards, and what
// we add into them: the heads Lichess has no element for, the clock's chip, heading and
// host's time, the board editor's button. Nothing of Lichess's is moved.

/** Each variant by the value its checkbox posts. */
const VARIANTS: Readonly<Record<string, string>> = {
  '1': 'standard',
  '10': 'crazyhouse',
  '2': 'chess960',
  '4': 'king-of-the-hill',
  '5': 'three-check',
  '6': 'antichess',
  '7': 'atomic',
  '8': 'horde',
  '9': 'racing-kings',
};

const CLASS = 'ln-ext-simul-form';

const closestOf = (element: Element | null, selector: string): HTMLElement | null => {
  const found = element?.closest(selector);
  return found instanceof HTMLElement ? found : null;
};

const fieldsetWith = (form: HTMLFormElement, selector: string): HTMLElement | null =>
  closestOf(form.querySelector(selector), 'fieldset');

/** A card's head of our own: a tile for its icon, then its title. */
function cardHead(card: string, title: string): HTMLElement {
  const head = createElement('div', {
    className: `${CLASS}__head`,
    attrs: { 'data-ln-ext-card': card },
  });
  head.append(createElement('h2', { text: title }));
  return head;
}

function markParts(form: HTMLFormElement): void {
  const parts: [string, HTMLElement | null][] = [
    ['intro', queryOne(form, ':scope > p', HTMLParagraphElement)],
    ['name', closestOf(form.querySelector("input[name='name']"), '.form-group')],
    ['games', fieldsetWith(form, '.variants')],
    ['clock', fieldsetWith(form, "select[name='clockTime']")],
    ['entry', fieldsetWith(form, "select[name^='conditions.']")],
    ['start', closestOf(form.querySelector("input[name='estimatedStartAt']"), '.form-split')],
    ['description', closestOf(form.querySelector("textarea[name='text']"), '.form-group')],
    ['actions', queryOne(form, '.form-actions', HTMLElement)],
  ];
  for (const [part, element] of parts) if (element) setData(element, 'lnExtPart', part);
  for (const input of queryAll(form, ".variants input[type='checkbox']", HTMLInputElement)) {
    const tile = closestOf(input, '.checkable');
    if (tile) setData(tile, 'lnExtVariant', VARIANTS[input.value] ?? 'standard');
  }
  const box = nameBox(form);
  if (box) setData(box, 'lnExtSuffix', nameSuffix(form));
}

function addHeads(form: HTMLFormElement): void {
  const games = queryOne(form, "[data-ln-ext-part='games']", HTMLElement);
  const gamesTitle = games?.querySelector('legend')?.textContent.trim();
  const name = queryOne(form, "[data-ln-ext-part='name']", HTMLElement);
  if (name && gamesTitle) name.before(cardHead('games', gamesTitle));
  const start = queryOne(form, "[data-ln-ext-part='start']", HTMLElement);
  start?.before(cardHead('details', message('simulFormDetails')));
}

function addClockParts(form: HTMLFormElement): void {
  const clock = queryOne(form, "[data-ln-ext-part='clock']", HTMLElement);
  clock?.querySelector('legend')?.append(createElement('span', { className: `${CLASS}__chip` }));
  const hostSplit = form.querySelector("select[name='clockExtra']")?.closest('.form-split');
  if (!hostSplit) return;
  hostSplit.before(
    createElement('p', { className: `${CLASS}__sub`, text: message('simulFormExtraTime') }),
  );
  const host = createElement('div', { className: `${CLASS}__host` });
  host.append(
    createElement('b', { className: `${CLASS}__host-time` }),
    createElement('span', { className: `${CLASS}__host-note` }),
    createElement('span', { className: `${CLASS}__host-others` }),
  );
  hostSplit.after(host);
}

// A board beside the field, and the board editor's link as a button: Lichess gives it
// only in the field's help.
function addPositionParts(form: HTMLFormElement): void {
  const field = queryOne(form, "input[name='position']", HTMLInputElement);
  const link = queryOne(
    form,
    "[data-ln-ext-part='games'] small a[href$='/editor']",
    HTMLAnchorElement,
  );
  if (!field) return;
  field.before(createElement('span', { className: `${CLASS}__board` }));
  if (!link) return;
  field.after(
    createElement('a', {
      className: `${CLASS}__editor button button-empty`,
      text: link.textContent.trim(),
      attrs: { href: link.href, target: '_blank', rel: 'noopener' },
    }),
  );
}

/** Marks the form's parts and adds ours, once. */
export function buildParts(form: HTMLFormElement): void {
  markParts(form);
  addHeads(form);
  addClockParts(form);
  addPositionParts(form);
}
