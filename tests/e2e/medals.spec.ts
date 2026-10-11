import { expect, test } from './fixtures.ts';
import { horizontalOverflow } from './support/layout.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// A profile's medals, under its chart: a coin per family, struck in the metal won, or a
// well ringed with its progress. A long-standing grandmaster has some of each.

const PROFILE = '/@/DrNykterstein';

test('a profile shows its medals, won and not, under its chart', async ({ page }) => {
  await openLichess(page, PROFILE);
  const section = page.locator('#us_profile + .lr-ext-medals');
  await expect(section.locator('.lr-ext-medal')).toHaveCount(9);
  const games = section.locator("[data-lr-ext-medal='games']");
  await expect(games).toHaveAttribute('data-lr-ext-metal', /^(bronze|silver|gold|crystal)$/);
  await expect(games.locator('.lr-ext-medal__count')).toHaveText(/^[\d,.\s]+(\/ [\d,.\s]+)?$/);
  expect(await computedStyle(games.locator('.lr-ext-medal__coin'), 'background-image')).toMatch(
    /^conic-gradient/,
  );
  expect(await computedStyle(games.locator('.lr-ext-medal__icon'), 'mask-image')).toMatch(
    /hugeicons\/chess-01\.svg/,
  );
  const locked = section.locator("[data-lr-ext-metal='none']").first();
  await expect(locked).toBeAttached();
  expect(
    await computedStyle(locked.locator('.lr-ext-medal__coin'), 'background-image', '::before'),
  ).toMatch(/^conic-gradient/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the medals scroll sideways in their row, not the page', async ({ page }) => {
    await openLichess(page, PROFILE);
    const row = page.locator('.lr-ext-medals__row');
    await expect(row.locator('.lr-ext-medal')).toHaveCount(9);
    expect(await row.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await horizontalOverflow(page)).toBe(0);
  });
});
