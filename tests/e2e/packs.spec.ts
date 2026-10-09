import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { closeMenu, lichessChoices, openPicker, packChoice, pickerTab } from './support/dasher.ts';
import { computedStyle, openLichess } from './support/lichess.ts';
import { EXAMPLE_ID, importExamplePack, serveRepository } from './support/packs.ts';
import { ourSounds } from './support/sounds.ts';

// Lichess's own board, pieces and sounds, until the user imports a pack from
// GitHub (docs/packs.md) and picks it for one of them.

const boardImage = (page: Page): Promise<string> =>
  computedStyle(page.locator('main .main-board cg-board'), 'background-image', '::before');

const knightImage = (page: Page): Promise<string> =>
  computedStyle(page.locator('main .main-board piece.knight.white').first(), 'background-image');

const LICHESS_ASSET = /^url\("https:\/\/lichess1\.org\/assets\//;
const PACK_SVG = /^url\("data:image\/svg\+xml;base64,/;

test('Lichess’s own board, pieces and sounds, with no pack picked', async ({ page }) => {
  await openLichess(page, '/analysis');
  await expect(page.locator('main .main-board piece.knight.white').first()).toBeVisible();
  expect(await knightImage(page)).toMatch(LICHESS_ASSET);
  expect(await boardImage(page)).toMatch(LICHESS_ASSET);
  await expect(page.locator('html')).not.toHaveAttribute('data-lr-ext-board', /./);
  await expect(page.locator('style#lr-ext-packs')).toHaveCount(0);
  expect((await ourSounds(page)).size).toBe(0);
});

test('a pack imported from GitHub shows its board, pieces and sounds, and stays', async ({
  page,
  context,
}) => {
  await serveRepository(context);
  await openLichess(page, '/analysis');
  await importExamplePack(page);
  await expect(page.locator('html')).toHaveAttribute('data-lr-ext-board', 'pack');
  await expect.poll(() => knightImage(page)).toMatch(PACK_SVG);
  await expect.poll(() => boardImage(page)).toMatch(PACK_SVG);
  await expect.poll(async () => (await ourSounds(page)).size).toBe(12);
  const sounds = [...(await ourSounds(page)).values()];
  for (const url of sounds) expect(url).toMatch(/^blob:https:\/\/lichess\.org\//);
  // The bytes made it across: each blob is a whole WAV.
  const sizes = await page.evaluate(
    urls => Promise.all(urls.map(async url => (await (await fetch(url)).blob()).size)),
    sounds,
  );
  for (const size of sizes) expect(size).toBeGreaterThan(1000);

  // Read back from the browser's storage: the board is drawn, never Lichess's first.
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('main .main-board piece.knight.white').first()).toBeVisible();
  expect(await knightImage(page)).toMatch(PACK_SVG);
  expect(await boardImage(page)).toMatch(PACK_SVG);
  await expect.poll(async () => (await ourSounds(page)).size).toBe(12);
});

test('Lichess’s own list hands a part back, and a removed pack is gone', async ({
  page,
  context,
}) => {
  await serveRepository(context);
  await openLichess(page, '/analysis');
  await importExamplePack(page);

  const board = await openPicker(page, 'board');
  await pickerTab(board, 'lichess').click();
  await lichessChoices(board).nth(2).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-lr-ext-board', /./);
  await expect.poll(() => boardImage(page)).toMatch(LICHESS_ASSET);
  expect(await knightImage(page)).toMatch(PACK_SVG);
  await closeMenu(page);

  const pieces = await openPicker(page, 'piece');
  await expect(pickerTab(pieces, 'packs')).toHaveClass(/\bactive\b/);
  const choice = packChoice(pieces, EXAMPLE_ID);
  await choice.hover();
  await pieces.locator('.lr-ext-src-remove').click();
  await expect(choice).toHaveCount(0);
  await expect.poll(() => knightImage(page)).toMatch(LICHESS_ASSET);
  await expect.poll(async () => (await ourSounds(page)).size).toBe(0);
});
