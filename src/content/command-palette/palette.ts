import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import { closestTo, createElement, queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { actionEntries, pageEntries, type Entry } from './entries.ts';
import { listMarkup, ROW_ID } from './markup.ts';
import { asksPlayers, fetchPlayers } from './players.ts';
import { rank } from './rank.ts';

// The command palette (styles/command-palette.css): a box over the page that finds a
// page, an action or a player as one types, picked with the arrows and Enter. The pages
// and actions are read once it opens; players are asked of Lichess a moment after typing.

const DIALOG_ID = 'ln-ext-palette';
const LIST_ID = 'ln-ext-palette-list';
const PLAYERS_DELAY_MS = 150;

interface Palette {
  readonly dialog: HTMLDialogElement;
  readonly input: HTMLInputElement;
  readonly list: HTMLElement;
}

let palette: Palette | null = null;
let local: Entry[] = [];
let players: Entry[] = [];
let shown: Entry[] = [];
let picked = 0;
let lookup: AbortController | null = null;
// Players are on their way: an empty list doesn't say "nothing found" yet.
let waiting = false;

const sameEntry = (entry: Entry | undefined, other: Entry | undefined): boolean =>
  entry !== undefined && entry.label === other?.label && entry.href === other.href;

const inGroup = (group: Entry['group']): Entry[] => local.filter(entry => entry.group === group);

// Empty, the actions over the pages; else the pages found first, as more is typed for them.
function entriesFor(query: string): Entry[] {
  if (!query.trim())
    return [...inGroup('actions'), ...inGroup('pages')].filter(entry => !entry.searchOnly);
  const found = [...rank(inGroup('pages'), query), ...rank(inGroup('actions'), query)];
  return [...found, ...players];
}

function render({ input, list }: Palette): void {
  const before = shown[picked];
  shown = entriesFor(input.value);
  const kept = shown.findIndex(entry => sameEntry(entry, before));
  picked = kept === -1 ? 0 : kept;
  setHtml(list, listMarkup(shown, picked, waiting));
  for (const [index, entry] of shown.entries()) {
    if (entry.icon.kind !== 'picture') continue;
    const picture = queryOne(list, `#${ROW_ID}-${index} .ln-ext-palette__picture`, HTMLElement);
    if (picture) setStyleProperty(picture, '--ln-ext-palette-picture', entry.icon.url);
  }
  input.setAttribute('aria-activedescendant', shown.length > 0 ? `${ROW_ID}-${picked}` : '');
}

function pick(next: number, scroll: boolean): void {
  if (!palette || next === picked || !shown[next]) return;
  picked = next;
  for (const row of queryAll(palette.list, '[role=option]', HTMLElement))
    row.setAttribute('aria-selected', String(row.id === `${ROW_ID}-${next}`));
  palette.input.setAttribute('aria-activedescendant', `${ROW_ID}-${next}`);
  if (scroll) document.getElementById(`${ROW_ID}-${next}`)?.scrollIntoView({ block: 'nearest' });
}

async function showPlayers(view: Palette, query: string, signal: AbortSignal): Promise<void> {
  // Offline, or typed on.
  const found = await fetchPlayers(query, signal).catch(() => null);
  if (signal.aborted) return;
  players = found ?? [];
  waiting = false;
  render(view);
}

function lookUp(view: Palette): void {
  lookup?.abort();
  players = [];
  const query = view.input.value;
  waiting = asksPlayers(query);
  if (!waiting) return;
  const controller = new AbortController();
  lookup = controller;
  window.setTimeout(() => {
    if (!controller.signal.aborted) void showPlayers(view, query, controller.signal);
  }, PLAYERS_DELAY_MS);
}

function activate(entry: Entry | undefined, newTab: boolean): void {
  if (!entry) return;
  palette?.dialog.close();
  if (entry.run) entry.run();
  else if (entry.href && newTab) window.open(entry.href, '_blank', 'noopener');
  else if (entry.href) location.assign(entry.href);
}

function onKeyDown(event: KeyboardEvent): void {
  // Lichess's own shortcuts (the board's arrows, its keyboard moves) stay out of it.
  event.stopPropagation();
  if (event.isComposing || shown.length === 0) return;
  const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
  if (step !== undefined) {
    event.preventDefault();
    pick((picked + step + shown.length) % shown.length, true);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    activate(shown[picked], event.metaKey || event.ctrlKey);
  }
}

function onListClick(event: MouseEvent): void {
  const row = closestTo(event.target, '[role=option]', HTMLElement);
  const entry = shown[Number(row?.dataset.lnExtIndex)];
  if (!entry) return;
  // A link follows itself, in a new tab too; the box only closes.
  if (entry.href) palette?.dialog.close();
  else activate(entry, false);
}

function onPointerMove(event: PointerEvent): void {
  const row = closestTo(event.target, '[role=option]', HTMLElement);
  if (row) pick(Number(row.dataset.lnExtIndex), false);
}

function build(): Palette {
  const dialog = createElement('dialog', {
    id: DIALOG_ID,
    className: 'ln-ext-palette',
    attrs: { 'aria-label': message('paletteSearch') },
  });
  setHtml(
    dialog,
    html`<div class="ln-ext-palette__box">
      <label class="ln-ext-palette__field">${hugeicon(Search01Icon)}<input
          class="ln-ext-palette__input" type="text" role="combobox" aria-expanded="true"
          aria-controls="${LIST_ID}" aria-autocomplete="list" autocomplete="off"
          spellcheck="false" placeholder="${message('palettePlaceholder')}" /><kbd
          class="ln-ext-palette__esc">esc</kbd></label>
      <div class="ln-ext-palette__list" id="${LIST_ID}" role="listbox"></div>
      <div class="ln-ext-palette__foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> ${message('paletteMove')}</span>
        <span><kbd>↵</kbd> ${message('paletteOpen')}</span>
      </div>
    </div>`,
  );
  const input = queryOne(dialog, 'input', HTMLInputElement);
  const list = queryOne(dialog, `#${LIST_ID}`, HTMLElement);
  if (!input || !list) throw new Error('the palette has no field');
  const view = { dialog, input, list };
  input.addEventListener('input', () => {
    lookUp(view);
    render(view);
  });
  dialog.addEventListener('keydown', onKeyDown);
  list.addEventListener('click', onListClick);
  list.addEventListener('pointermove', onPointerMove);
  // A click on the backdrop lands on the dialog itself.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => lookup?.abort());
  document.body.append(dialog);
  return view;
}

/** Opens the palette, empty, over the page; closes it if it's open. */
export function togglePalette(): void {
  if (!palette?.dialog.isConnected) palette = build();
  if (palette.dialog.open) return palette.dialog.close();
  local = [...pageEntries(), ...actionEntries()];
  players = [];
  shown = [];
  waiting = false;
  palette.input.value = '';
  render(palette);
  palette.dialog.showModal();
  palette.input.focus();
}
