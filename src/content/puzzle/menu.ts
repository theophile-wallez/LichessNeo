import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { message } from '#content/platform/runtime.ts';

// The puzzle page has one panel (styles/puzzle/layout.css): Lichess's side
// card is its header, cut to the puzzle's details. This cog opens the card
// whole over the panel, with the game, the theme and the settings.

const OPEN = 'cdc-puzzle-menu-open';

function setOpen(open: boolean): void {
  document.documentElement.classList.toggle(OPEN, open);
  const button = queryOne(document, '.cdc-puzzle-menu', HTMLButtonElement);
  if (button) setData(button, 'cdcOpen', open ? '' : null);
  button?.setAttribute('aria-expanded', String(open));
}

const isOpen = (): boolean => document.documentElement.classList.contains(OPEN);

function buildButton(): HTMLButtonElement {
  const label = message('puzzleMenu');
  const button = createElement('button', {
    className: 'cdc-puzzle-menu',
    attrs: { type: 'button', 'aria-label': label, 'aria-expanded': 'false', 'data-cdc-tip': label },
  });
  button.addEventListener('click', () => setOpen(!isOpen()));
  return button;
}

const ownButton = createOwnedElement(buildButton);

export function syncPuzzleMenu(): void {
  const main = queryOne(document, 'main.puzzle', HTMLElement);
  if (main) ownButton(main);
  else if (isOpen()) setOpen(false);
}

// A press anywhere else closes the card, as Escape does.
function onPointerDown(event: PointerEvent): void {
  if (!isOpen()) return;
  if (!closestTo(event.target, 'main.puzzle :is(.puzzle__side, .cdc-puzzle-menu)', Element))
    setOpen(false);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isOpen()) setOpen(false);
}

export function listenToMenu(): void {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
}
