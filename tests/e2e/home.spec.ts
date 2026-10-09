import { expect, test } from './fixtures.ts';
import { horizontalOverflow } from './support/layout.ts';
import { openLichess } from './support/lichess.ts';

// The home's quick pairing: a card per speed under the hero, in place of
// Lichess's pools tab. Its buttons join a real pool, so they aren't clicked.

for (const width of [1024, 1366, 1920]) {
  test(`the home's speed cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openLichess(page, '/');
    const speeds = page.locator('main.lobby > .lr-ext-hero + .lr-ext-speeds');
    await expect(speeds.locator('.lr-ext-speed')).toHaveCount(4);
    await expect(speeds.locator('.lr-ext-speed__pool')).toHaveCount(11);
    // Headed by the pools tab's own text, while that tab hides and the lobby's shows.
    const tabs = page.locator('.lobby__app > .tabs-horiz > button');
    await expect(tabs.first()).toBeHidden();
    await expect(speeds.locator('.lr-ext-speeds__title')).toHaveText(
      (await tabs.first().textContent()) ?? '',
    );
    await expect(page.locator('.lobby__app')).not.toHaveClass(/\blobby__app-pools\b/);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}

test("the custom game's pill opens Lichess's game setup", async ({ page }) => {
  await openLichess(page, '/');
  await page.locator('.lr-ext-speeds__custom').click();
  await expect(page.locator('.game-setup')).toBeVisible();
});

// Tablets and phones: two columns, then one, the start buttons still over the hero's foot.
for (const { width, height } of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1019, height: 800 },
]) {
  test(`the home fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openLichess(page, '/');
    await expect(page.locator('.lr-ext-speed')).toHaveCount(4);
    const hero = await page.locator('main.lobby > .lr-ext-hero').boundingBox();
    const table = await page.locator('main.lobby > .lobby__table').boundingBox();
    expect(table && hero && Math.round(table.y + table.height - (hero.y + hero.height))).toBe(0);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}

test('the hamburger opens the nav as a drawer, its sections folding open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLichess(page, '/');
  await page.locator('#top label.hbg').click();
  const puzzles = page.locator('#topnav > section').nth(1);
  await expect(puzzles.locator('> div')).toBeHidden();
  await puzzles.locator('> a').click();
  await expect(puzzles.locator('> div')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
