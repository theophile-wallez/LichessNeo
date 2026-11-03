import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { createOwnedElement } from '#shared/owned-element.ts';

// The analysis menu's "Continue from here" opened a dialog over the page with
// two links, against the computer or a friend, which Lichess takes from the
// menu's hidden `.continue-with`. They show in the menu instead, as a sub-menu
// under a back row, like the user menu's (styles/analysis/continue-with.css).

const MENU = 'main.analyse .analyse__tools > .action-menu';
// Lichess's swords, the button's only mark: its words are localized.
const CONTINUE = `${MENU} .action-menu__tools > button[data-icon='\ue033']`;
const BACK = 'ln-ext-menu-back';

function buildBack(): HTMLButtonElement {
  const back = createElement('button', { className: BACK, attrs: { type: 'button' } });
  back.addEventListener('click', () => {
    const menu = closestTo(back, MENU, HTMLElement);
    if (menu) setData(menu, 'lnExtSub', null);
  });
  return back;
}

const ownBack = createOwnedElement(buildBack);

function onClick(event: MouseEvent): void {
  const button = closestTo(event.target, CONTINUE, HTMLButtonElement);
  const menu = button && closestTo(button, MENU, HTMLElement);
  if (!button || !menu || !queryOne(menu, '.continue-with', HTMLElement)) return;
  // Before Lichess's own handler, on the button.
  event.stopPropagation();
  event.preventDefault();
  const back = ownBack(menu).element;
  back.textContent = button.textContent;
  setData(menu, 'lnExtSub', 'continue');
}

export function listenToContinueMenu(): void {
  document.addEventListener('click', onClick, true);
}
