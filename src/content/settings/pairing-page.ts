import { closestTo, createElement, queryOne } from '#shared/dom.ts';
import { setHtml, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import {
  customOf,
  DEFAULT_PICKS,
  isDefault,
  MAX_PICKS,
  pickKey,
  pickOf,
  playedBy,
  seeksOf,
  type CardPick,
  type CustomCard,
} from '#content/pages/speed-cards/picks.ts';
import { addClock, fillForm, madeCard, NEW_CARD, showClockButtons } from './pairing-form.ts';
import {
  pageMarkup,
  picksMarkup,
  previewMarkup,
  skeletonMarkup,
  suggestionsMarkup,
} from './pairing-markup.ts';
import { recentGames, suggestionsOf, type Suggestion } from './pairing-suggestions.ts';
import { currentSettings, onSettings, saveSetting } from './settings.ts';

// The settings' Quick pairing page: the home's cards, changed, moved, taken
// off and put back to the defaults; the cards suggested from the player's
// recent games, read once the page first opens; and a card of their own to
// make, in the form that also changes one of the home's.

export interface PairingPage {
  readonly element: HTMLElement;
  /** Reads the recent games the first time the page opens. */
  readonly show: (open: boolean) => void;
}

interface State {
  games: string | null;
  suggestions: Suggestion[];
  made: CardPick | null;
  /** The key of the home's card the form changes, if it does. */
  editing: string | null;
}

const picks = (): CardPick[] => currentSettings().quickPairing;
const save = (next: CardPick[]): Promise<void> => saveSetting('quickPairing', next);

function fill(page: HTMLElement, selector: string, markup: SafeHtml | string): void {
  const holder = queryOne(page, selector, HTMLElement);
  if (!holder) return;
  if (typeof markup === 'string') holder.textContent = markup;
  else setHtml(holder, markup);
}

// Why the made card can't go in, if it can't: the other cards play all its games already, or
// the home is full for one more.
function madeProblem(
  made: CustomCard | null,
  others: readonly CardPick[],
  adding: boolean,
): string {
  if (!made) return '';
  if (seeksOf(made).every(seek => playedBy(others, seek))) return message('pairingThere');
  return adding && others.length >= MAX_PICKS ? message('pairingFull', String(MAX_PICKS)) : '';
}

function draw(page: HTMLElement, state: State): void {
  const current = picks();
  const full = current.length >= MAX_PICKS;
  // The card changed went, from another tab or its own button.
  if (state.editing !== null && !current.some(pick => pickKey(pick) === state.editing))
    stopEditing(page, state);
  fill(
    page,
    "[data-ln-ext-pairing='cards'] .ln-ext-pairing__rows",
    picksMarkup(current, state.editing),
  );
  const reset = queryOne(page, "[data-ln-ext-action='reset']", HTMLButtonElement);
  // Always shown, so the way back to the defaults is never hidden; off while they are on.
  if (reset) reset.disabled = isDefault(current);
  if (state.games !== null) state.suggestions = suggestionsOf(state.games, current);
  fill(
    page,
    "[data-ln-ext-pairing='suggestions'] .ln-ext-pairing__rows",
    state.games === null ? skeletonMarkup() : suggestionsMarkup(state.suggestions, full),
  );
  fill(
    page,
    "[data-ln-ext-pairing='suggestions'] .ln-ext-pairing__note",
    suggestionsNote(state, full),
  );
  drawMade(page, state);
}

function suggestionsNote({ games, suggestions }: State, full: boolean): string {
  // The skeleton says it.
  if (games === null) return '';
  if (suggestions.length === 0) return message('pairingSuggestionsNone');
  return full ? message('pairingFull', String(MAX_PICKS)) : '';
}

function drawMade(page: HTMLElement, state: State): void {
  const form = queryOne(page, '.ln-ext-pairing__form', HTMLFormElement);
  if (!form) return;
  showClockButtons(form);
  const editing = state.editing !== null;
  const create = "[data-ln-ext-pairing='create']";
  fill(
    page,
    `${create} .ln-ext-setting__title`,
    message(editing ? 'pairingEditTitle' : 'pairingCreateTitle'),
  );
  fill(
    page,
    `${create} .ln-ext-setting__body`,
    message(editing ? 'pairingEditBody' : 'pairingCreateBody'),
  );
  const custom = madeCard(form);
  state.made = custom && pickOf(custom);
  const others = picks().filter(pick => pickKey(pick) !== state.editing);
  const problem = madeProblem(custom, others, !editing);
  const preview = state.made && previewMarkup(state.made, !problem, editing);
  fill(page, '.ln-ext-pairing__preview', preview ?? '');
  fill(page, '.ln-ext-pairing__made .ln-ext-pairing__note', problem);
}

/** Opens the home's card `pick` in the form, to change it; or, with null, empties the form. */
function edit(page: HTMLElement, state: State, pick: CardPick | null): void {
  const form = queryOne(page, '.ln-ext-pairing__form', HTMLFormElement);
  state.editing = pick && pickKey(pick);
  if (form) fillForm(form, pick ? customOf(pick) : NEW_CARD);
}

function stopEditing(page: HTMLElement, state: State): void {
  if (state.editing !== null) edit(page, state, null);
}

// The cards once the form's card is saved in place of the one it changes.
function saved(page: HTMLElement, state: State): CardPick[] | null {
  const current = picks();
  const index = current.findIndex(pick => pickKey(pick) === state.editing);
  const { made } = state;
  if (index < 0 || !made) return null;
  stopEditing(page, state);
  return current.with(index, made);
}

function moved(current: readonly CardPick[], index: number, by: number): CardPick[] {
  const next = [...current];
  const [pick] = next.splice(index, 1);
  if (pick) next.splice(index + by, 0, pick);
  return next;
}

// The form's own buttons: a row for another time control, or one less.
function onFormAction(page: HTMLElement, button: HTMLButtonElement, state: State): boolean {
  const form = closestTo(button, '.ln-ext-pairing__form', HTMLFormElement);
  const name = button.dataset.lnExtAction;
  if (!form || (name !== 'add-clock' && name !== 'remove-clock')) return false;
  if (name === 'add-clock') addClock(form);
  else closestTo(button, '.ln-ext-pairing__clock', HTMLElement)?.remove();
  drawMade(page, state);
  return true;
}

// A card's pencil, or the form's way out of changing it.
function onEdit(page: HTMLElement, name: string, key: string | undefined, state: State): boolean {
  if (name !== 'edit' && name !== 'cancel') return false;
  const pick = name === 'edit' ? picks().find(each => pickKey(each) === key) : undefined;
  edit(page, state, pick ?? null);
  draw(page, state);
  const form = queryOne(page, "[data-ln-ext-pairing='create']", HTMLElement);
  if (pick) form?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

function onAction(page: HTMLElement, event: MouseEvent, state: State): void {
  const button = closestTo(event.target, '[data-ln-ext-action]', HTMLButtonElement);
  const name = button?.dataset.lnExtAction;
  if (!button || button.disabled || !name || onFormAction(page, button, state)) return;
  const row = closestTo(button, '.ln-ext-pairing__row', HTMLElement);
  if (onEdit(page, name, row?.dataset.lnExtKey, state)) return;
  const next = name === 'save' ? saved(page, state) : actedOn(name, row, state);
  if (next) void save(next);
}

// The cards once the button `name` of the row `row` is clicked; null if they don't change.
function actedOn(name: string, row: HTMLElement | null, state: State): CardPick[] | null {
  const current = picks();
  const key = row?.dataset.lnExtKey;
  const index = current.findIndex(pick => pickKey(pick) === key);
  if (name === 'reset') return DEFAULT_PICKS;
  if (name === 'up' || name === 'down') return moved(current, index, name === 'up' ? -1 : 1);
  if (name === 'remove') return current.filter((_, at) => at !== index);
  const added =
    state.suggestions.find(({ pick }) => pickKey(pick) === key)?.pick ??
    (state.made && pickKey(state.made) === key ? state.made : null);
  return added && current.length < MAX_PICKS ? [...current, added] : null;
}

async function readGames(page: HTMLElement, state: State): Promise<void> {
  const user = document.body.dataset.user;
  state.games = user ? await recentGames(user) : '';
  draw(page, state);
}

/** The page's cards, kept in step with the settings. */
export function buildPairingPage(): PairingPage {
  const element = createElement('div', { className: 'ln-ext-settings__list' });
  setHtml(element, pageMarkup());
  const state: State = { games: null, suggestions: [], made: null, editing: null };
  element.addEventListener('click', event => onAction(element, event, state));
  element.addEventListener('change', () => drawMade(element, state));
  element.addEventListener('submit', event => event.preventDefault());
  draw(element, state);
  onSettings(() => draw(element, state));
  let read = false;
  return {
    element,
    show: open => {
      if (!open || read) return;
      read = true;
      void readGames(element, state);
    },
  };
}
