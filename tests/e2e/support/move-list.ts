import type { Locator, Page } from '@playwright/test';

// Lichess's move list on the analysis page (`.tview2`): the game's moves are
// its direct `move` children, a variation sits in an `interrupt` between them.

export const mainlineMoves = (page: Page): Locator =>
  page.locator('main.analyse .tview2 > move:not(.empty)');

/** The ply of the move on the board, 0 for the starting position. */
export function activePly(page: Page): Promise<number> {
  return page.evaluate(() => {
    const moves = [...document.querySelectorAll('main.analyse .tview2 > move:not(.empty)')];
    return moves.findIndex(move => move.classList.contains('active')) + 1;
  });
}

/** The variations played on the board, as the review marks them (not the engine's lines). */
export const ownVariations = (page: Page): Locator =>
  page.locator('main.analyse .tview2 interrupt line.lr-ext-var');
