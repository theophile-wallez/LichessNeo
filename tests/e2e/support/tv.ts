import { expect, type Page } from '@playwright/test';
import { z } from 'zod/mini';
import { readPageGlobal } from './lichess.ts';

// Lichess TV, which can switch to another game in the middle of a test, and
// the game page's keys, which the extension's board tools press.

// The bindings of Lichess's key handler (lila's ui/site/src/mousetrap.ts), by key.
const BindingsSchema = z.record(z.string(), z.unknown());

async function boundKeys(page: Page, keys: readonly string[]): Promise<string[]> {
  try {
    const bindings = BindingsSchema.safeParse(
      await readPageGlobal(page, ['site', 'mousetrap', 'bindings']),
    );
    return bindings.success ? keys.filter(key => key in bindings.data) : [];
  } catch {
    // The page is reloading: nothing is bound in it yet.
    return [];
  }
}

/**
 * Waits until the game page handles `keys`. Lichess binds them in an idle
 * callback after the game starts (lila's round ctrl.ts, `delayedInit`), often
 * after `load`: a key pressed before that does nothing.
 */
export async function waitForRoundKeys(page: Page, keys: readonly string[]): Promise<void> {
  await expect
    .poll(() => boundKeys(page, keys), { message: `Lichess handles the keys ${keys.join(' ')}` })
    .toEqual(keys);
}

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
