import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The game page's board tools (styles/game/board-extras.css): a cog right of
// the board's top corner, and under it a flip button that shows while the
// pointer is on the board. They press Lichess's own keys: `h` for its board
// menu (whose button the stylesheet hides), `f` to flip.

const HOVER = 'ln-ext-board-tools--hover';
const BUTTON = 'ln-ext-board-tools__btn';

function toolButton(name: string, key: string): HTMLButtonElement {
  const button = createElement('button', {
    attrs: { type: 'button', class: `${BUTTON} ${BUTTON}--${name}` },
  });
  button.addEventListener('click', () =>
    button.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true })),
  );
  return button;
}

function buildTools(): HTMLElement {
  const root = createElement('div', { className: 'ln-ext-board-tools' });
  root.append(toolButton('menu', 'h'), toolButton('flip', 'f'));
  return root;
}

function setTip(button: HTMLButtonElement | null, label: string | undefined): void {
  if (!button || !label || button.dataset.lnExtTip === label) return;
  setData(button, 'lnExtTip', label);
  button.setAttribute('aria-label', label);
}

const ownTools = createOwnedElement(buildTools);
/** The tools built last, for the pointer handlers. */
let tools: HTMLElement | null = null;

export function syncBoardTools(): void {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) return;
  tools = ownTools(main).element;
  const menu = queryOne(tools, `.${BUTTON}--menu`, HTMLButtonElement);
  // Our tooltips move a hovered button's title to data-ln-ext-tip.
  const lichessMenu = queryOne(main, '.board-menu-toggle-btn', HTMLElement);
  setTip(menu, nonEmpty(lichessMenu?.title) ?? lichessMenu?.dataset.lnExtTip);
  setTip(
    queryOne(tools, `.${BUTTON}--flip`, HTMLButtonElement),
    document.documentElement.dataset.lnExtFlipLabel,
  );
  menu?.classList.toggle(`${BUTTON}--on`, lichessMenu?.classList.contains('active') ?? false);
}

function onMouseOver(event: MouseEvent): void {
  if (!tools?.isConnected) return;
  const target = closestTo(
    event.target,
    'main.round :is(.round__app__board, .ln-ext-board-tools)',
    Element,
  );
  tools.classList.toggle(HOVER, target !== null);
}

// The pointer left the window.
function onMouseOut(event: MouseEvent): void {
  if (!event.relatedTarget) tools?.classList.toggle(HOVER, false);
}

export const boardTools: Feature = {
  name: 'board tools',
  start: () => {
    onEveryTick('board tools', syncBoardTools);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
  },
};
