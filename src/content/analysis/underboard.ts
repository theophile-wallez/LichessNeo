import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// What Lichess shows under the board, which our layout drops so the page never
// scrolls: the free board's FEN and PGN fields; a game's charts, crosstable,
// "Request a computer analysis" and "Share & export"; a study's toolbar
// (comments, glyphs, server eval, tags, share). A button in the controls opens
// it over the engine and the moves (styles/analysis/underboard.css), with the
// advice summary and its "Learn from your mistakes" over the chat.

export const OPEN = 'lr-ext-underboard-open';
const BUTTON = 'lr-ext-underboard';
// Lichess's tools glyph.
const ICON = '';
// Lichess's own "Tools" (i18n.site.tools), which the page world copies onto
// <html> (src/page/labels); English until it's there.
const FALLBACK_LABEL = 'Tools';

const UNDERBOARD = 'main.analyse > .analyse__underboard';
// A practice drill shows its goal there already (styles/practice-run).
const PRACTICE = 'main.analyse .practice__side';
// Lichess's "Learn from your mistakes" box, in place of the moves' tools.
const RETRO = 'main.analyse .analyse__tools > .retro-box';

let retroShown = false;

function buildButton(): HTMLButtonElement {
  const button = createElement('button', {
    className: `fbt ${BUTTON}`,
    attrs: { type: 'button', 'data-icon': ICON },
  });
  button.addEventListener('click', () => {
    const root = document.documentElement;
    root.classList.toggle(OPEN, !root.classList.contains(OPEN));
    syncUnderboard();
  });
  return button;
}

const ownButton = createOwnedElement(buildButton);

// Our tooltips read data-lr-ext-tip.
function setLabel(button: HTMLButtonElement): void {
  const label = document.documentElement.dataset.lrExtToolsLabel ?? FALLBACK_LABEL;
  if (button.dataset.lrExtTip === label) return;
  setData(button, 'lrExtTip', label);
  button.setAttribute('aria-label', label);
}

function hasUnderboard(): boolean {
  const underboard = document.querySelector(UNDERBOARD);
  return Boolean(underboard?.firstElementChild) && !document.querySelector(PRACTICE);
}

// Starting "Learn from your mistakes" from the panel closes it, or it would
// cover the box that runs the exercise.
function closeOnRetro(): void {
  const shown = document.querySelector(RETRO) !== null;
  if (shown && !retroShown) document.documentElement.classList.toggle(OPEN, false);
  retroShown = shown;
}

export function syncUnderboard(): void {
  const root = document.documentElement;
  const controls = queryOne(document, 'main.analyse .analyse__controls', HTMLElement);
  if (!controls || !hasUnderboard()) {
    if (root.classList.contains(OPEN)) root.classList.toggle(OPEN, false);
    return;
  }
  closeOnRetro();
  const button = ownButton(controls).element;
  setLabel(button);
  const open = root.classList.contains(OPEN);
  button.classList.toggle('active', open);
  if (button.getAttribute('aria-pressed') !== String(open))
    button.setAttribute('aria-pressed', String(open));
}

export const underboard: Feature = {
  name: 'underboard',
  start: () => onEveryTick('underboard', syncUnderboard),
};
