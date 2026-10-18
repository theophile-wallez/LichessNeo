import { expect, type Page } from '@playwright/test';

// Opening Lichess's pages, and reading what the extension sets on them.

/** A finished game with no server analysis, seen from Black: its review is ours alone. */
export const FINISHED_GAME = { id: 'tKlG0mrQ', path: '/tKlG0mrQ/black' };

/**
 * Opens a page of lichess.org (relative to the config's baseURL) once it has
 * loaded, and waits for the content script's mark on <html>, set at
 * document_start: without it the extension isn't there, and nothing else
 * the test sees means anything.
 */
export async function openLichess(page: Page, path: string): Promise<void> {
  await goToLichess(page, path);
  await expect(page.locator('html')).toHaveAttribute(
    'data-ln-ext-assets',
    /^chrome-extension:\/\//,
  );
}

// Lichess answers 429 with its "Too many requests" page when one network asks
// too much, as CI runners can: back off and ask again before giving up.
const RATE_LIMIT_BACKOFF_MS = [5_000, 15_000, 30_000];
const TOO_MANY_REQUESTS = 429;

async function goToLichess(page: Page, path: string): Promise<void> {
  for (const backoff of [0, ...RATE_LIMIT_BACKOFF_MS]) {
    if (backoff > 0) await page.waitForTimeout(backoff);
    const response = await page.goto(path, { waitUntil: 'load' });
    if (response?.status() !== TOO_MANY_REQUESTS) return;
  }
  throw new Error(`lichess.org keeps rate-limiting this network (${path})`);
}

/** A CSS variable as computed on <html>, trimmed. */
export function rootVariable(page: Page, name: string): Promise<string> {
  return page.evaluate(
    variable => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    name,
  );
}
