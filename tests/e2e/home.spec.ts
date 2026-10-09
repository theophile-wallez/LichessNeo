import { expect, test } from './fixtures.ts';
import { horizontalOverflow } from './support/layout.ts';
import { openLichess } from './support/lichess.ts';

// The home's quick pairing: a card per speed under the hero, in place of
// Lichess's pools tab. Its buttons join a real pool, so they aren't clicked.

for (const width of [1024, 1366, 1920]) {
  test(`the home's speed cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openLichess(page, '/');
    const speeds = page.locator('main.lobby > .cdc-hero + .cdc-speeds');
    await expect(speeds.locator('.cdc-speed')).toHaveCount(4);
    await expect(speeds.locator('.cdc-speed__pool')).toHaveCount(11);
    // Headed by the pools tab's own text, while that tab hides and the lobby's shows.
    const tabs = page.locator('.lobby__app > .tabs-horiz > button');
    await expect(tabs.first()).toBeHidden();
    await expect(speeds.locator('.cdc-speeds__title')).toHaveText(
      (await tabs.first().textContent()) ?? '',
    );
    await expect(page.locator('.lobby__app')).not.toHaveClass(/\blobby__app-pools\b/);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}

test("the custom game's pill opens Lichess's game setup", async ({ page }) => {
  await openLichess(page, '/');
  await page.locator('.cdc-speeds__custom').click();
  await expect(page.locator('.game-setup')).toBeVisible();
});
