import Add01Icon from '@hugeicons/core-free-icons/Add01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import { INCREMENTS, MINUTES, minutesLabel, VARIANTS } from '#shared/custom-seek.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { CustomCardSchema, MAX_CLOCKS, type CustomCard } from '#content/pages/speed-cards/picks.ts';
import { variantName } from './pairing-names.ts';

// The form that makes a card of the player's own, or changes one of the home's
// (styles/pages/settings-pairing-form.css): a variant and a mode, then up to four time
// controls, a row each.

interface Clock {
  readonly minutes: number;
  readonly increment: number;
}

// A new row's time control: the first of these the form doesn't have yet. The first one
// has no pool.
const NEXT_CLOCKS: readonly Clock[] = [
  { minutes: 3, increment: 1 },
  { minutes: 5, increment: 0 },
  { minutes: 10, increment: 0 },
  { minutes: 1, increment: 0 },
  { minutes: 15, increment: 10 },
  { minutes: 30, increment: 0 },
];

const option = (value: string, label: string, selected: boolean): SafeHtml =>
  html`<option value="${value}" ${selected && html`selected`}>${label}</option>`;

const field = (name: string, label: string, options: readonly SafeHtml[]): SafeHtml =>
  html`<label class="ln-ext-pairing__field">
    <span>${label}</span>
    <select class="ln-ext-setting__select" name="${name}">${options}</select>
  </label>`;

const clockMarkup = ({ minutes, increment }: Clock): SafeHtml =>
  html`${field(
    'minutes',
    message('pairingMinutes'),
    MINUTES.map(each => option(String(each), minutesLabel(each), each === minutes)),
  )}
  ${field(
    'increment',
    message('pairingIncrement'),
    INCREMENTS.map(each => option(String(each), String(each), each === increment)),
  )}
  <button type="button" class="ln-ext-pairing__action" data-ln-ext-action="remove-clock" title="${message('pairingRemoveClock')}" aria-label="${message('pairingRemoveClock')}">
    ${hugeicon(Cancel01Icon)}
  </button>`;

const [FIRST_CLOCK = { minutes: 3, increment: 1 }] = NEXT_CLOCKS;

/** What the form starts with. */
export const NEW_CARD: CustomCard = { variant: 'standard', rated: true, clocks: [FIRST_CLOCK] };

const clocksMarkup = (clocks: readonly Clock[]): SafeHtml =>
  html`${clocks.map(clock => html`<div class="ln-ext-pairing__clock">${clockMarkup(clock)}</div>`)}`;

/** The form, with `NEW_CARD` in it. */
export const formMarkup = (): SafeHtml =>
  html`<form class="ln-ext-pairing__form">
    <div class="ln-ext-pairing__fields">
      ${field(
        'variant',
        message('pairingVariant'),
        VARIANTS.map(variant =>
          option(variant, variantName(variant), variant === NEW_CARD.variant),
        ),
      )}
      ${field('mode', message('pairingMode'), [
        option('rated', message('pairingRated'), NEW_CARD.rated),
        option('casual', message('pairingCasual'), !NEW_CARD.rated),
      ])}
    </div>
    <div class="ln-ext-pairing__clocks">
      ${clocksMarkup(NEW_CARD.clocks)}
    </div>
    <button type="button" class="ln-ext-pairing__more" data-ln-ext-action="add-clock">
      ${hugeicon(Add01Icon)}<span>${message('pairingAddClock')}</span>
    </button>
    <div class="ln-ext-pairing__made">
      <ul class="ln-ext-pairing__rows ln-ext-pairing__preview"></ul>
      <p class="ln-ext-pairing__note" aria-live="polite"></p>
    </div>
  </form>`;

const clocksOf = (data: FormData): Clock[] => {
  const increments = data.getAll('increment');
  return data
    .getAll('minutes')
    .map((minutes, index) => ({ minutes: Number(minutes), increment: Number(increments[index]) }));
};

const sameClock = (one: Clock, other: Clock): boolean =>
  one.minutes === other.minutes && one.increment === other.increment;

/** The card the form makes, a time control picked twice kept once; null if it can't be played. */
export function madeCard(form: HTMLFormElement): CustomCard | null {
  const data = new FormData(form);
  const clocks = clocksOf(data).filter(
    (clock, index, all) => all.findIndex(each => sameClock(each, clock)) === index,
  );
  const card = CustomCardSchema.safeParse({
    variant: data.get('variant'),
    rated: data.get('mode') === 'rated',
    clocks,
  });
  return card.success ? card.data : null;
}

/** Shows the buttons that fit: another row while there's room, a cross while there are two. */
export function showClockButtons(form: HTMLFormElement): void {
  const rows = queryAll(form, '.ln-ext-pairing__clock', HTMLElement);
  const more = queryOne(form, "[data-ln-ext-action='add-clock']", HTMLButtonElement);
  if (more) more.hidden = rows.length >= MAX_CLOCKS;
  for (const remove of queryAll(form, "[data-ln-ext-action='remove-clock']", HTMLButtonElement))
    remove.hidden = rows.length === 1;
}

/** Adds a row for another time control, one the form doesn't have yet. */
export function addClock(form: HTMLFormElement): void {
  const holder = queryOne(form, '.ln-ext-pairing__clocks', HTMLElement);
  if (!holder || holder.children.length >= MAX_CLOCKS) return;
  const taken = clocksOf(new FormData(form));
  const next = NEXT_CLOCKS.find(clock => !taken.some(each => sameClock(each, clock)));
  const row = createElement('div', { className: 'ln-ext-pairing__clock' });
  setHtml(row, clockMarkup(next ?? FIRST_CLOCK));
  holder.append(row);
}

function pick(form: HTMLFormElement, name: string, value: string): void {
  const select = form.elements.namedItem(name);
  if (select instanceof HTMLSelectElement) select.value = value;
}

/** Puts `card` in the form, a row per time control. */
export function fillForm(form: HTMLFormElement, { variant, rated, clocks }: CustomCard): void {
  pick(form, 'variant', variant);
  pick(form, 'mode', rated ? 'rated' : 'casual');
  const holder = queryOne(form, '.ln-ext-pairing__clocks', HTMLElement);
  if (holder) setHtml(holder, clocksMarkup(clocks));
}
