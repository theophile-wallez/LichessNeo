import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { nonEmpty } from '#shared/text.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { listenToContinueMenu } from './continue-menu.ts';
import { ANALYSIS, type BoardPage, pressKey, ROUND, type ToolName } from './pages.ts';

// The board tools of the game and analysis pages (styles/game/board-extras.css,
// styles/analysis/board-tools.css): a cog right of the board's top corner, and
// under it a flip button and, in a game the user plays, a Zen button, which
// show while the pointer is on the board. The cog opens Lichess's menu, the
// others press its keys: `f` to flip, `z` for Zen.

const HOVER = 'ln-ext-board-tools--hover';
const BUTTON = 'ln-ext-board-tools__btn';
const KEYS: Readonly<Record<Exclude<ToolName, 'menu'>, string>> = { flip: 'f', zen: 'z' };

function toolButton(page: BoardPage, name: ToolName): HTMLButtonElement {
  const button = createElement('button', {
    attrs: { type: 'button', class: `${BUTTON} ${BUTTON}--${name}` },
  });
  button.addEventListener('click', () => {
    const main = closestTo(button, page.main, HTMLElement);
    if (name !== 'menu') pressKey(button, KEYS[name]);
    else if (main) {
      page.toggleMenu(main);
      if (page.menu) setData(main, 'lnExtMenuFrom', 'board');
    }
  });
  return button;
}

const toolsBuilder = (page: BoardPage) => (): HTMLElement => {
  const root = createElement('div', { className: 'ln-ext-board-tools' });
  root.append(...page.tools.map(name => toolButton(page, name)));
  return root;
};

function setTip(button: HTMLButtonElement | null, label: string | undefined): void {
  if (!button || !label || button.dataset.lnExtTip === label) return;
  setData(button, 'lnExtTip', label);
  button.setAttribute('aria-label', label);
}

const PAGES = [ROUND, ANALYSIS].map(page => ({
  page,
  own: createOwnedElement(toolsBuilder(page)),
}));
/** The tools built last, for the pointer handlers. */
let tools: HTMLElement | null = null;
let shownOn: BoardPage | null = null;

export function syncBoardTools(): void {
  for (const { page, own } of PAGES) {
    const main = queryOne(document, page.main, HTMLElement);
    // A broadcast's page is an analysis page without a board.
    if (!main || !queryOne(main, page.board, HTMLElement)) continue;
    tools = own(main).element;
    shownOn = page;
    syncMenu(main, tools, page);
    if (page === ROUND) syncZen(tools);
    return;
  }
}

function syncMenu(main: HTMLElement, root: HTMLElement, page: BoardPage): void {
  const menu = queryOne(root, `.${BUTTON}--menu`, HTMLButtonElement);
  // Our tooltips move a hovered button's title to data-ln-ext-tip.
  const lichessMenu = queryOne(main, page.menuToggle, HTMLElement);
  setTip(menu, nonEmpty(lichessMenu?.title) ?? lichessMenu?.dataset.lnExtTip);
  setTip(
    queryOne(root, `.${BUTTON}--flip`, HTMLButtonElement),
    document.documentElement.dataset.lnExtFlipLabel,
  );
  if (menu && menu.hidden !== !lichessMenu) menu.hidden = !lichessMenu;
  menu?.classList.toggle(`${BUTTON}--on`, lichessMenu?.classList.contains('active') ?? false);
}

// Lichess's Zen button (#zentog), server-rendered in a game the user plays, names Zen mode;
// once in, the button is the way out, and says so.
function syncZen(root: HTMLElement): void {
  const zen = queryOne(root, `.${BUTTON}--zen`, HTMLButtonElement);
  const inZen = document.body.classList.contains('zen');
  const zenToggle = document.getElementById('zentog');
  setTip(zen, inZen ? message('zenExit') : nonEmpty(zenToggle?.textContent?.trim()));
  zen?.classList.toggle(`${BUTTON}--on`, inZen);
}

function onMouseOver(event: MouseEvent): void {
  if (!tools?.isConnected || !shownOn) return;
  const target = closestTo(
    event.target,
    `${shownOn.main} :is(${shownOn.board}, .ln-ext-board-tools)`,
    Element,
  );
  tools.classList.toggle(HOVER, target !== null);
}

// The pointer left the window.
function onMouseOut(event: MouseEvent): void {
  if (!event.relatedTarget) tools?.classList.toggle(HOVER, false);
}

// Lichess's analysis menu stays open until its button is pressed again: now that it floats
// over the page (styles/analysis/board-tools.css), a press elsewhere closes it, as Escape
// does, like the game's board menu. Not while a dialog is up (its Settings): a press there
// is for the dialog.
function openMenuPage(): BoardPage | null {
  const page = shownOn;
  if (!page?.menu || document.querySelector('dialog[open]')) return null;
  return document.querySelector(`${page.main} ${page.menu}`) ? page : null;
}

function closeMenu(page: BoardPage): void {
  const main = queryOne(document, page.main, HTMLElement);
  if (main) page.toggleMenu(main);
}

// The analysis menu opens from the cog pressed: ours, or the controls' (styles/analysis).
function markOpener(event: PointerEvent): void {
  const page = shownOn;
  const toggle = page?.menu && closestTo(event.target, `${page.main} ${page.menuToggle}`, Element);
  const main = toggle && closestTo(toggle, page.main, HTMLElement);
  if (main) setData(main, 'lnExtMenuFrom', 'controls');
}

function onPointerDown(event: PointerEvent): void {
  markOpener(event);
  const page = openMenuPage();
  if (!page) return;
  // One selector each: happy-dom matches an `:is()` of combinators wrongly.
  const parts = [page.menu, page.menuToggle, '.ln-ext-board-tools'];
  const inside = parts.some(
    part => part !== undefined && closestTo(event.target, `${page.main} ${part}`, Element),
  );
  if (!inside) closeMenu(page);
}

function onKeyDown(event: KeyboardEvent): void {
  const page = event.key === 'Escape' ? openMenuPage() : null;
  if (page) closeMenu(page);
}

export const boardTools: Feature = {
  name: 'board tools',
  start: () => {
    onEveryTick('board tools', syncBoardTools);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    listenToContinueMenu();
  },
};
