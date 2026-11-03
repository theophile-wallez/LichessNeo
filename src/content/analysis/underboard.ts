import { closestTo, createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { ANALYSIS } from '#content/board-tools/pages.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The free board's FEN and PGN fields, which Lichess shows under the board and
// our layout drops so the page never scrolls: a row of the analysis menu opens
// them over the engine and the moves (styles/analysis/underboard.css), and a
// close button over them puts them away. A game's underboard needs no way in:
// its charts are the review's graph's views, its crosstable and export the
// review's share sheet, its server analysis the move list's end.

export const OPEN = 'ln-ext-underboard-open';
const ROW = 'ln-ext-menu-fen';
const CLOSE = 'ln-ext-underboard-close';
// The fields' own names, which Lichess doesn't translate either.
const LABEL = 'FEN & PGN';

const FIELDS = 'main.analyse > .analyse__underboard > .copyables';
const MENU = 'main.analyse .analyse__tools > .action-menu';

function setOpen(open: boolean): void {
  document.documentElement.classList.toggle(OPEN, open);
}

const isOpen = (): boolean => document.documentElement.classList.contains(OPEN);

function buildRow(): HTMLButtonElement {
  const row = createElement('button', { className: ROW, text: LABEL, attrs: { type: 'button' } });
  row.addEventListener('click', () => {
    setOpen(true);
    const main = closestTo(row, 'main.analyse', HTMLElement);
    if (main) ANALYSIS.toggleMenu(main);
  });
  return row;
}

function buildClose(): HTMLButtonElement {
  const close = createElement('button', {
    className: CLOSE,
    attrs: { type: 'button', 'aria-label': message('underboardClose') },
  });
  close.addEventListener('click', () => setOpen(false));
  return close;
}

const ownRow = createOwnedElement(buildRow);
const ownClose = createOwnedElement(buildClose);

export function syncUnderboard(): void {
  const fields = queryOne(document, FIELDS, HTMLElement);
  if (!fields) {
    if (isOpen()) setOpen(false);
    return;
  }
  const tools = queryOne(document, `${MENU} .action-menu__tools`, HTMLElement);
  if (tools) ownRow(tools);
  if (fields.parentElement) ownClose(fields.parentElement);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isOpen() && !closestTo(event.target, 'dialog', Element))
    setOpen(false);
}

export const underboard: Feature = {
  name: 'underboard',
  start: () => {
    onEveryTick('underboard', syncUnderboard);
    document.addEventListener('keydown', onKeyDown);
  },
};
