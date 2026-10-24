import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import { z } from 'zod/mini';
import { closestTo, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import type { GameOverTexts } from './texts.ts';

// The game over's card folds down to the buttons under it, on the game's page as
// on its analysis (page/review/view/card-fold.ts), and stays folded from one game
// to the next. Both chevrons are always drawn, and a mark on an ancestor picks
// one (styles/game/game-end-fold.css), so that CSS eases the card between the two.

export type FoldAction = 'fold' | 'unfold';

const CHEVRON = hugeicon(ArrowDown01Icon);

export const isCardFolded = (): boolean =>
  readStored(StorageKey.endCardFolded, z.literal('1')) !== null;

export function storeCardFolded(folded: boolean): void {
  writeStored(StorageKey.endCardFolded, folded ? '1' : '0');
}

export function foldButtonMarkup(texts: GameOverTexts, action: FoldAction): SafeHtml {
  const label = action === 'fold' ? texts.fold.hide : texts.fold.show;
  return html`<button type="button" class="ln-ext-end__fold ln-ext-end__fold--${action}" data-ln-ext="${action}" aria-label="${label}" title="${label}">${CHEVRON}</button>`;
}

/** The box that folds: the card, its chevron in the corner. */
export const foldingCardMarkup = (card: SafeHtml, texts: GameOverTexts): SafeHtml =>
  html`<div class="ln-ext-end__top"><div class="ln-ext-end__top-inner">${card}${foldButtonMarkup(texts, 'fold')}</div></div>`;

/** The chevron pressed is hidden once the card has folded or unfolded: the focus moves to the other. */
export function focusOtherChevron(root: HTMLElement, folded: boolean): void {
  const other: FoldAction = folded ? 'unfold' : 'fold';
  queryOne(root, `.ln-ext-end__fold--${other}`, HTMLElement)?.focus({ preventScroll: true });
}

/** On the game's page, where the card heads Lichess's buttons: `main` carries the mark. */
export function foldOnClick(main: HTMLElement): void {
  setData(main, 'lnExtCardFolded', isCardFolded() ? '' : null);
  main.addEventListener('click', event => {
    const button = closestTo(event.target, '.ln-ext-end__fold', HTMLElement);
    if (!button) return;
    const folded = button.dataset.lnExt === 'fold';
    const focused = document.activeElement === button;
    storeCardFolded(folded);
    setData(main, 'lnExtCardFolded', folded ? '' : null);
    if (focused) focusOtherChevron(main, folded);
  });
}
