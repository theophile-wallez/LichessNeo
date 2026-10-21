import { pieceOf, wrapOrientation } from '#shared/chessground.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { CAPTURABLE_ROLES, capturedMarkup, type BarSide, type MaterialPiece } from './material.ts';

// The captured pieces in the game page's and the analysis board's player
// bars (styles/playerbar.css), read off the board as it is drawn. A board
// without players gets them too, in thin bars of their own, and studies and
// broadcasts in Lichess's bars.

function readPieces(board: Element): MaterialPiece[] {
  const pieces: MaterialPiece[] = [];
  for (const element of board.querySelectorAll('piece')) {
    const piece = pieceOf(element);
    if (!piece) continue;
    const role = CAPTURABLE_ROLES.find(name => name === piece.role);
    if (role) pieces.push({ color: piece.color, role });
  }
  return pieces;
}

// Three-check: Lichess counts the checks a side gave as kings in its
// material difference, which our bars hide.
function readChecks(main: Element): Record<BarSide, number> {
  const count = (side: BarSide): number =>
    main.querySelectorAll(`.material-${side} mpiece.king`).length;
  return { top: count('top'), bottom: count('bottom') };
}

// The game page names the variant on its app, the analysis board on <main>.
function readVariant(main: HTMLElement): string | undefined {
  const classes = queryOne(main, '.round__app', HTMLElement)?.className ?? main.className;
  return /\bvariant-(\w+)/.exec(classes)?.[1];
}

// Studies and broadcasts have player bars of Lichess's: the rows go in
// them, in its material difference's place. Elsewhere they go in <main>.
function rowParents(main: HTMLElement): Record<BarSide, Element> {
  const top = main.querySelector(':is(.study__player-top, .relay-board-player-top)');
  const bottom = main.querySelector(':is(.study__player-bot, .relay-board-player-bot)');
  return top && bottom ? { top, bottom } : { top: main, bottom: main };
}

/** Tells whether the pieces on `board` may have changed since last asked. */
function createPiecesWatch(): (board: Element) => boolean {
  let watched: Element | null = null;
  let changed = true;
  // Chessground adds and removes pieces, and swaps a piece's class to change it.
  const observer = new MutationObserver(() => {
    changed = true;
  });
  return board => {
    if (board !== watched) {
      observer.disconnect();
      observer.observe(board, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
      watched = board;
      changed = true;
    }
    const result = changed;
    changed = false;
    return result;
  };
}

/** A sync task drawing the captured pieces. */
export function createCapturedSync(): () => void {
  const ownTopRow = createOwnedElement(() =>
    createElement('div', { className: 'ln-ext-captured ln-ext-captured--top' }),
  );
  const ownBottomRow = createOwnedElement(() =>
    createElement('div', { className: 'ln-ext-captured ln-ext-captured--bottom' }),
  );
  const piecesChanged = createPiecesWatch();
  let lastKey = '';
  let lastInputs = '';
  return () => {
    const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
    const wrap =
      main && queryOne(main, '.round__app__board .cg-wrap, .analyse__board > .cg-wrap', Element);
    const board = wrap?.querySelector('cg-board');
    if (!main || !wrap || !board) return;
    // A practice lesson has no players.
    if (main.querySelector('.practice__side')) {
      for (const row of main.querySelectorAll('.ln-ext-captured')) row.remove();
      return;
    }
    const variant = readVariant(main);
    const bottomColor = wrapOrientation(wrap);
    const checks = variant === 'threeCheck' ? readChecks(main) : { top: 0, bottom: 0 };
    const parents = rowParents(main);
    const topRow = ownTopRow(parents.top);
    const bottomRow = ownBottomRow(parents.bottom);
    const rowsNew = topRow.isNew || bottomRow.isNew;
    // Reading the pieces is the costly part: skip it while nothing it depends on moved.
    const inputs = `${variant}|${bottomColor}|${checks.top}|${checks.bottom}`;
    if (!piecesChanged(board) && !rowsNew && inputs === lastInputs) return;
    lastInputs = inputs;
    const markup = capturedMarkup({
      pieces: readPieces(board),
      bottom: bottomColor,
      variant,
      checks,
    });
    if (rowsNew) lastKey = '';
    const key = `${markup.top.value}|${markup.bottom.value}`;
    if (key === lastKey) return;
    lastKey = key;
    setHtml(topRow.element, markup.top);
    setHtml(bottomRow.element, markup.bottom);
  };
}

export const capturedPieces: Feature = {
  name: 'captured pieces',
  start: () => onEveryTick('captured pieces', createCapturedSync()),
};
