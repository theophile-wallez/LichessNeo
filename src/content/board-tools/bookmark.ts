import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { nonEmpty } from '#shared/text.ts';
import type { BoardPage } from './pages.ts';

// Lichess puts its bookmark star (`a.bookmark`) in `.game__meta`, which the
// analysis page hides and the game page only tabs when there is no chat. Where
// the page has one (a game viewed signed in), a star under the board's cog and
// a row of the cog's menu pass clicks to it and follow its `.bookmarked` class.

const LINK = '.game__meta a.bookmark';
const TOOL = 'ln-ext-board-tools__btn';
const TOOL_BOOKMARK = `${TOOL} ${TOOL}--bookmark`;
const TOOL_ON = `${TOOL}--on`;
const ROW = 'ln-ext-menu-bookmark';
const ROW_ON = `${ROW}--on`;
const STAR = hugeicon(StarIcon);

let toolEl: HTMLButtonElement | null = null;
let rowEl: HTMLButtonElement | null = null;

const labelOf = (link: HTMLAnchorElement): string | undefined =>
  nonEmpty(link.title) ?? nonEmpty(link.dataset.lnExtTip);

function toggleFrom(control: HTMLElement): void {
  const main = closestTo(control, 'main', HTMLElement);
  const link = main && queryOne(main, LINK, HTMLAnchorElement);
  if (!link) return;
  // If clicked before Lichess's delegated handler is live, don't follow the href.
  link.addEventListener('click', event => event.preventDefault(), { once: true });
  link.click();
  paintBookmark(link);
}

function buildTool(): HTMLButtonElement {
  const button = createElement('button', {
    className: TOOL_BOOKMARK,
    attrs: { type: 'button', 'aria-pressed': 'false' },
  });
  setHtml(button, STAR);
  button.addEventListener('click', () => toggleFrom(button));
  toolEl = button;
  return button;
}

function buildRow(): HTMLButtonElement {
  const row = createElement('button', {
    className: ROW,
    attrs: { type: 'button', 'aria-pressed': 'false' },
  });
  setHtml(row, html`${STAR}<span></span>`);
  row.addEventListener('click', () => toggleFrom(row));
  rowEl = row;
  return row;
}

const ownTool = createOwnedElement(buildTool);
const ownRow = createOwnedElement(buildRow);

function paintButton(button: HTMLButtonElement | null, onClass: string, on: boolean): void {
  if (!button?.isConnected) return;
  button.classList.toggle(onClass, on);
  const pressed = String(on);
  if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
}

function paintBookmark(link: HTMLAnchorElement): void {
  const on = link.classList.contains('bookmarked');
  const label = labelOf(link);
  if (toolEl?.isConnected && label && toolEl.dataset.lnExtTip !== label) {
    setData(toolEl, 'lnExtTip', label);
    toolEl.setAttribute('aria-label', label);
  }
  const span = rowEl?.isConnected ? queryOne(rowEl, 'span', HTMLElement) : null;
  if (span && label && span.textContent !== label) span.textContent = label;
  paintButton(toolEl, TOOL_ON, on);
  paintButton(rowEl, ROW_ON, on);
}

export function syncBookmark(main: HTMLElement, tools: HTMLElement, page: BoardPage): void {
  const link = queryOne(main, LINK, HTMLAnchorElement);
  if (!link) {
    toolEl?.remove();
    rowEl?.remove();
    return;
  }
  ownTool(tools);
  const menuRows = queryOne(main, page.menuRows, HTMLElement);
  if (menuRows) ownRow(menuRows);
  paintBookmark(link);
}
