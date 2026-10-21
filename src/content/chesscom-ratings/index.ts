import { keepChesscomShown } from '#shared/chesscom-rating/shown.ts';
import { restoreRating, swapRating } from '#shared/chesscom-rating/swap.ts';
import { queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { currentSettings, onSettings } from '#content/settings/settings.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { SPOTS } from './spots.ts';

// With the settings' Chess.com ratings on (the Experimental page), every
// rating Lichess writes shows its Chess.com equivalent instead, the Lichess
// one in its tooltip. Our own ratings (the sidebar's, the home's cards, the
// review's) draw theirs, from the switch kept in localStorage.

const SWAPPED = '[data-ln-ext-chesscom-rating]';

const tip = (rating: string): string => message('lichessRatingTip', rating);

/** Swaps the ratings under `root`, with the switch on: the hover card calls it as it's drawn. */
export function syncChesscomRatings(root: ParentNode): void {
  if (!currentSettings().chesscomRating) return;
  for (const { selector, speed } of SPOTS)
    for (const element of queryAll(root, selector, HTMLElement))
      swapRating(element, speed(element), tip);
}

let swapped = false;

function sync(): void {
  if (currentSettings().chesscomRating) {
    syncChesscomRatings(document);
    swapped = true;
  } else if (swapped) {
    swapped = false;
    for (const element of queryAll(document, SWAPPED, HTMLElement)) restoreRating(element);
  }
}

export const chesscomRatings: Feature = {
  name: 'chess.com ratings',
  start: () => {
    onSettings(settings => keepChesscomShown(settings.chesscomRating));
    onEveryTick('chess.com ratings', sync);
  },
};
