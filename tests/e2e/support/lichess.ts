import { expect, type Locator, type Page } from '@playwright/test';

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
    'data-lr-ext-assets',
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

/** A CSS variable as set inline on <html> by the extension, '' when it isn't. */
export function inlineRootVariable(page: Page, name: string): Promise<string> {
  return page.evaluate(
    variable => document.documentElement.style.getPropertyValue(variable).trim(),
    name,
  );
}

/** A computed style property of an element or one of its pseudo-elements. */
export function computedStyle(
  locator: Locator,
  property: string,
  pseudo?: '::before' | '::after',
): Promise<string> {
  return locator.evaluate(
    (element, { name, pseudoElement }) =>
      getComputedStyle(element, pseudoElement).getPropertyValue(name),
    { name: property, pseudoElement: pseudo ?? null },
  );
}

/**
 * Reads a value off the page's own objects (`['site', 'sound', 'paths']`), in
 * the page's world. A Map comes back as its entries. Validate the result: it
 * is whatever Lichess holds there.
 */
export function readPageGlobal(page: Page, path: readonly string[]): Promise<unknown> {
  return page.evaluate(
    (keys): unknown => {
      let value: unknown = window;
      for (const key of keys) {
        if (typeof value !== 'object' || value === null) return undefined;
        value = Reflect.get(value, key);
      }
      return value instanceof Map ? Array.from(value.entries()) : value;
    },
    [...path],
  );
}

/** The page's stored value under `key`, or null. */
export function storedValue(page: Page, key: string): Promise<string | null> {
  return page.evaluate(storageKey => localStorage.getItem(storageKey), key);
}
