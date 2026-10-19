import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  Browser as BrowserName,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from '@puppeteer/browsers';
import { launch, type Browser, type Page } from 'puppeteer-core';

// A smoke test of the Firefox build (dist/firefox, from
// `node scripts/build.ts --target firefox`), run by Node's test runner.
// Playwright can't load an extension into Firefox; Puppeteer can, over
// WebDriver BiDi, into a stock Firefox it downloads once into ~/.cache/puppeteer.

const EXTENSION_DIR = path.resolve(
  process.env['LN_EXT_FIREFOX_EXTENSION_DIR'] ??
    path.join(import.meta.dirname, '..', '..', 'dist', 'firefox'),
);
const CACHE_DIR = path.join(homedir(), '.cache', 'puppeteer');
const TIMEOUT_MS = 30_000;
// The default color theme's panels, in each scheme: headless Firefox may answer either.
const PANEL_COLORS = { dark: 'oklch(17.3% 0.004 286)', light: 'oklch(98.5% 0.006 286)' };
// From GitHub itself: Firefox runs the download in the background script,
// whose requests a page's interception never sees.
const EXAMPLE_LINK = 'https://github.com/theophile-wallez/LichessNeo/tree/main/packs/example';

/** Firefox's current release, downloaded unless it's already in the cache. */
async function firefoxPath(): Promise<string> {
  const platform = detectBrowserPlatform();
  if (platform === undefined) throw new Error('Firefox has no build for this platform');
  const buildId = await resolveBuildId(BrowserName.FIREFOX, platform, 'stable');
  const firefox = await install({ browser: BrowserName.FIREFOX, buildId, cacheDir: CACHE_DIR });
  return firefox.executablePath;
}

async function openLichess(browser: Browser, pathname: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`https://lichess.org${pathname}`, { waitUntil: 'load' });
  return page;
}

interface ContentScriptMarks {
  readonly panel: string;
  readonly expectedPanel: string;
  readonly assets: string;
}

/** What the content script sets on <html>: the theme's colors, the extension's base URL. */
function contentScriptMarks(page: Page): Promise<ContentScriptMarks> {
  return page.evaluate(
    colors => ({
      panel: getComputedStyle(document.documentElement)
        .getPropertyValue('--ln-ext-bg-panel')
        .trim(),
      expectedPanel: document.documentElement.classList.contains('light')
        ? colors.light
        : colors.dark,
      assets: document.documentElement.dataset.lnExtAssets ?? '',
    }),
    PANEL_COLORS,
  );
}

/**
 * Whether the page script is in: page/motion answers every reduced-motion
 * query as if nothing were asked, whatever the browser's setting.
 */
function pageScriptIsIn(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
      matchMedia('(prefers-reduced-motion: no-preference)').matches,
  );
}

/** Imports the example pack from the user menu's Board panel, as a user would. */
async function importExamplePack(page: Page): Promise<void> {
  await page.click('#top .dasher > .toggle');
  await page.waitForSelector('#dasher_app .subs > button.sub', { timeout: TIMEOUT_MS });
  await page.evaluate(() => {
    for (const item of document.querySelectorAll('#dasher_app .subs > button.sub'))
      if (item.textContent === 'Board' && item instanceof HTMLElement) item.click();
  });
  const tab = '#dasher_app div.sub.board .ln-ext-src-tabs button[data-ln-ext-tab="packs"]';
  await page.waitForSelector(tab, { timeout: TIMEOUT_MS });
  await page.click(tab);
  await page.type('#dasher_app .ln-ext-src-import input[type="url"]', EXAMPLE_LINK);
  await page.click('#dasher_app .ln-ext-src-import button');
  await page.waitForFunction(
    () =>
      document.querySelector('#dasher_app .ln-ext-src-status')?.textContent?.startsWith('Imported'),
    { timeout: TIMEOUT_MS },
  );
}

/** Waits for the board's white knight to be drawn from a pack's image. */
async function knightFromPack(page: Page): Promise<boolean> {
  const drawn = await page.waitForFunction(
    () => {
      const knight = document.querySelector('cg-board piece.knight.white');
      return (
        knight !== null &&
        getComputedStyle(knight).backgroundImage.startsWith('url("data:image/svg')
      );
    },
    { timeout: TIMEOUT_MS },
  );
  return drawn.jsonValue();
}

// One Firefox for the lot, its pages opened one after the other.
await test('the Firefox build', async suite => {
  if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json')))
    throw new Error(`No extension in ${EXTENSION_DIR}: node scripts/build.ts --target firefox`);
  const browser = await launch({
    browser: 'firefox',
    executablePath: await firefoxPath(),
    headless: true,
  });
  suite.after(() => browser.close());
  await browser.installExtension(EXTENSION_DIR);

  await suite.test('the home page gets the theme, the hero and the page script', async () => {
    const page = await openLichess(browser, '/');
    const marks = await contentScriptMarks(page);
    assert.equal(marks.panel, marks.expectedPanel);
    assert.match(marks.assets, /^moz-extension:\/\//);
    await page.waitForSelector('main.lobby > .ln-ext-hero', { timeout: TIMEOUT_MS });
    assert.equal(await pageScriptIsIn(page), true);
    await page.close();
  });

  // The download in the background script, and IndexedDB from a content script.
  await suite.test(
    'a pack imported from GitHub draws the board, and stays after a reload',
    async () => {
      const page = await openLichess(browser, '/analysis');
      await importExamplePack(page);
      assert.equal(await knightFromPack(page), true);
      await page.reload({ waitUntil: 'load' });
      assert.equal(await knightFromPack(page), true);
      await page.close();
    },
  );

  await suite.test('the free analysis board gets the coach, and its face', async () => {
    const page = await openLichess(browser, '/analysis');
    const marks = await contentScriptMarks(page);
    assert.equal(marks.panel, marks.expectedPanel);
    // The page script adds the coach's panel, the content script its face over the portrait.
    await page.waitForSelector('#ln-ext-review .ln-ext-coach .ln-ext-coach__rig svg', {
      timeout: TIMEOUT_MS,
    });
    await page.close();
  });
});
