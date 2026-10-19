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

/** Follows the user menu's Board panel to the settings' Packs page, as a user would. */
async function openPacksSettings(page: Page): Promise<void> {
  await page.click('#top .dasher > .toggle');
  await page.waitForSelector('#dasher_app .subs > button.sub', { timeout: TIMEOUT_MS });
  await page.evaluate(() => {
    for (const item of document.querySelectorAll('#dasher_app .subs > button.sub'))
      if (item.textContent === 'Board' && item instanceof HTMLElement) item.click();
  });
  const link = '#dasher_app div.sub.board .ln-ext-src-import-link';
  await page.waitForSelector(link, { timeout: TIMEOUT_MS });
  assert.match(
    await page.$eval(link, anchor => anchor.getAttribute('href') ?? ''),
    /\/account\/profile#ln-ext-extension\/packs$/,
  );
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click(link)]);
}

/**
 * Signed out, as here, Lichess answers the account pages with its sign-in form:
 * this puts the account page's menu and content in its place, as lila serves them.
 */
async function rebuildAccountPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const account = document.createElement('main');
    account.className = 'account page-menu';
    account.innerHTML =
      '<nav class="page-menu__menu subnav"><div class="subnav__inner">' +
      '<a class="active" href="/account/profile">Profile</a><div class="sep"></div>' +
      '<a href="/account/preferences/display">Display</a></div></nav>' +
      '<div class="page-menu__content box"><h1 class="box__top">Edit profile</h1></div>';
    document.querySelector('#main-wrap > main')?.replaceWith(account);
  });
}

/** Imports the example pack from the settings' Packs page, as a user would. */
async function importExamplePack(page: Page): Promise<void> {
  await openPacksSettings(page);
  await rebuildAccountPage(page);
  const form =
    '.ln-ext-settings__page[data-ln-ext-page="packs"]:not([hidden]) .ln-ext-packs__import';
  await page.waitForSelector(`${form} input[type="url"]`, { visible: true, timeout: TIMEOUT_MS });
  await page.type(`${form} input[type="url"]`, EXAMPLE_LINK);
  await page.click(`${form} .ln-ext-packs__row button`);
  // The pack's row comes in once it's stored; a failed import says why in the status.
  await page.waitForSelector('.ln-ext-packs__list .ln-ext-pack, .ln-ext-packs__status--failed', {
    timeout: TIMEOUT_MS,
  });
  const status = await page.$eval('.ln-ext-packs__status', line => ({
    text: line.textContent,
    failed: line.classList.contains('ln-ext-packs__status--failed'),
  }));
  assert.equal(status.failed, false, status.text);
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

const COACH_AVATAR = '#ln-ext-review .ln-ext-coach .ln-ext-coach__avatar';

/**
 * What the review's coach shows: "live" once its mascot is drawn, else the URL
 * of its still, once that image loads.
 */
async function coachFace(page: Page): Promise<string> {
  await page.waitForSelector(`${COACH_AVATAR} .ln-ext-coach__face`, { timeout: TIMEOUT_MS });
  // An empty answer is "not yet": waitForFunction waits while it's falsy.
  const face = await page.waitForFunction(
    async avatarSelector => {
      const avatar = document.querySelector(avatarSelector);
      const face = avatar?.querySelector('.ln-ext-coach__face');
      if (!avatar || !face) return '';
      if (avatar.classList.contains('ln-ext-coach__avatar--live') && face.querySelector('canvas'))
        return 'live';
      const still = /^url\("(.+)"\)$/.exec(getComputedStyle(face, '::before').backgroundImage)?.[1];
      if (still === undefined) return '';
      const image = new Image();
      image.src = still;
      return image.decode().then(
        () => still,
        () => '',
      );
    },
    { timeout: TIMEOUT_MS },
    COACH_AVATAR,
  );
  return face.jsonValue();
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

  // The download in the background script, and IndexedDB from a content script: the
  // pack is stored on the settings' page and read back on the board's.
  await suite.test('a pack imported from GitHub draws the board on the next pages', async () => {
    const page = await openLichess(browser, '/analysis');
    await importExamplePack(page);
    await page.goto('https://lichess.org/analysis', { waitUntil: 'load' });
    assert.equal(await knightFromPack(page), true);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await knightFromPack(page), true);
    await page.close();
  });

  await suite.test('the free analysis board gets the coach, and its face', async check => {
    const page = await openLichess(browser, '/analysis');
    const marks = await contentScriptMarks(page);
    assert.equal(marks.panel, marks.expectedPanel);
    // The page script adds the coach's panel and avatar; the content script plays the 3D
    // mascot over it, or, without WebGL, its CSS shows the still from the extension's files.
    const face = await coachFace(page);
    check.diagnostic(`the coach's face: ${face}`);
    assert.match(face, /^(live|moz-extension:\/\/.+\/img\/coaches\/mascot-\d+\.webp)$/);
    await page.close();
  });
});
