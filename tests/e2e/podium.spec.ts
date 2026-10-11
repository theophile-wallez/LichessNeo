import { avatarOf } from '#shared/avatar.ts';
import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// A finished tournament's podium, Arena or Swiss: each player's mascot on a metal step,
// their score above it.

const ARENA = {
  name: 'an Arena',
  path: '/tournament/UHT5EfTT',
  winner: 'matejovicjuraj',
  score: '36',
};
const SWISS = { name: 'a Swiss', path: '/swiss/IBgRVoCf', winner: 'AdamFink', score: '7.5' };

for (const { name, path, winner, score } of [ARENA, SWISS]) {
  test(`${name}’s podium puts each player on their step`, async ({ page }) => {
    await openLichess(page, path);
    const places = page.locator('.podium > div');
    await expect(places).toHaveCount(3);
    for (const place of await places.all()) {
      const href = await place.locator('> a.user-link').getAttribute('href');
      const user = href?.split('/')[2] ?? '';
      await expect(place).toHaveAttribute('data-lr-ext-avatar-coach', String(avatarOf(user).coach));
      await expect
        .poll(() => computedStyle(place.locator('.trophy'), 'background-image', '::after'))
        .toMatch(new RegExp(`img/coaches/mascot-${avatarOf(user).coach}\\.webp`));
      await expect(place.locator('> .lr-ext-podium__score')).toHaveText(/^\d/);
    }
    const first = page.locator('.podium > .first');
    await expect(first.locator('> a.user-link')).toHaveText(winner);
    await expect(first.locator('> .lr-ext-podium__score > b')).toHaveText(score);
    expect(await computedStyle(first, 'content', '::after')).toBe('"1"');
    expect(await computedStyle(first, 'background-image', '::after')).toMatch(/^linear-gradient/);
    expect(await computedStyle(first.locator('.trophy'), 'mask-image', '::before')).toMatch(
      /hugeicons\/crown\.svg/,
    );
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the podium shows, where Lichess hides it, and fits the width', async ({ page }) => {
    await openLichess(page, SWISS.path);
    const podium = page.locator('.podium');
    await expect(podium).toBeVisible();
    await expect(podium.locator('> .first .trophy')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
