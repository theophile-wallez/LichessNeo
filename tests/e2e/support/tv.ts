import type { Page } from '@playwright/test';

// Lichess TV, which can switch to another game in the middle of a test.

const PAGE_MARK = 'lrExtTestPageMark';
const ATTEMPTS = 3;

/** Marks the page's window, which a reload replaces; false if it can't be reached. */
async function markPage(page: Page): Promise<boolean> {
  try {
    await page.evaluate(mark => Reflect.set(window, mark, true), PAGE_MARK);
    return true;
  } catch {
    return false;
  }
}

async function isMarked(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(mark => Reflect.get(window, mark) === true, PAGE_MARK);
  } catch {
    // Its context is gone: the page is reloading.
    return false;
  }
}

/**
 * Runs `steps` on a single TV game. TV reloads the page when it moves to another
 * game (lila's round.ts on `tvSelect`, ctrl.ts 10 s after a game ends), and steps
 * that ran across a reload prove nothing either way: they run again on the new page.
 */
export async function onOneTvGame(page: Page, steps: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    await page.waitForLoadState('load');
    if (!(await markPage(page))) continue;
    const failure = await steps().then(
      () => null,
      (error: unknown) => ({ error }),
    );
    if (!(await isMarked(page))) continue;
    if (failure !== null) throw failure.error;
    return;
  }
  throw new Error(`Lichess TV reloaded the page during each of ${ATTEMPTS} attempts`);
}
