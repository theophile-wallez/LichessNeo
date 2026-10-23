import { queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { parsePlacement } from '#shared/chess/fen.ts';
import { colorLetter, ROLE_LETTERS } from '#shared/chess/pieces.ts';
import { parseSquare, squareCoords } from '#shared/chess/squares.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';

// A little still board: the board's colors and set, turned one way, its last
// move lit (review/mini-board.css).

export interface MiniPosition {
  /** A FEN, or its placement alone. */
  readonly fen: string;
  /** The move that led there, in UCI, or null at the start. */
  readonly lastMove: string | null;
}

/** A square's column and row on screen, from the top left, the board turned to `orientation`. */
function cell(square: Square, orientation: Color): string {
  const [file, rank] = squareCoords(square);
  const white = orientation === 'white';
  return `--x:${white ? file : 7 - file};--y:${white ? 7 - rank : rank}`;
}

export function miniBoard({ fen, lastMove }: MiniPosition, orientation: Color): SafeHtml {
  const board = parsePlacement(fen.split(' ')[0] ?? '');
  const lit = [lastMove?.slice(0, 2), lastMove?.slice(2, 4)].flatMap(text => {
    const square = text === undefined ? null : parseSquare(text);
    return square
      ? [html`<span class="ln-ext-mini__lit" style="${cell(square, orientation)}"></span>`]
      : [];
  });
  const pieces = [...board].map(([square, { color, role }]) => {
    const code = `${colorLetter(color)}${ROLE_LETTERS[role]}`;
    return html`<i class="ln-ext-pc ln-ext-pc-${code}" style="${cell(square, orientation)}"></i>`;
  });
  return html`<div class="ln-ext-mini">${lit}${pieces}</div>`;
}

// A texture is a relief blended over the squares (styles/board/pieces.css): without its
// blend mode it shows as grey.
const BACKGROUND = [
  'background-image',
  'background-size',
  'background-position',
  'background-blend-mode',
];

/** Gives the little boards the board's own background, whichever it is: ours, a pack's or Lichess's. */
export function copyBoardBackground(minis: readonly HTMLElement[]): void {
  const board = queryOne(document, '.is2d cg-board', HTMLElement);
  if (!board || minis.length === 0) return;
  followBoard();
  const style = getComputedStyle(board, '::before');
  const values = BACKGROUND.map(property => [property, style.getPropertyValue(property)]);
  for (const mini of minis)
    for (const [property = '', value = ''] of values) setStyleProperty(mini, property, value);
}

let following = false;

const copyAgain = oncePerFrame(() =>
  copyBoardBackground(queryAll(document, '.ln-ext-mini', HTMLElement)),
);

/**
 * Copies it again whenever the board may change: our menu sets <html>'s data and
 * variables, Lichess's its <body>'s and a stylesheet, a pack its own <style>.
 */
function followBoard(): void {
  if (following) return;
  following = true;
  const observer = new MutationObserver(records => {
    for (const record of records)
      for (const node of record.addedNodes)
        if (node instanceof HTMLLinkElement)
          node.addEventListener('load', copyAgain, { once: true });
    copyAgain();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-ln-ext-board', 'data-ln-ext-backlit'],
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-board'],
  });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
}
