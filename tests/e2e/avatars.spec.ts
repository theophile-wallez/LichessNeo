import { avatarOf } from '#shared/avatar.ts';
import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// Each user's avatar is a coach's still on their own color, picked from their name.

/** A finished game of DrNykterstein's, both players signed in. */
const USERS_GAME = '/kAdOQKeh/black';

const stillOf = (user: string): RegExp =>
  new RegExp(`img/coaches/mascot-${avatarOf(user).coach}\\.webp`);

test('a profile, a forum post and a hover card show their user’s avatar', async ({ page }) => {
  await openLichess(page, '/@/DrNykterstein');
  const header = page.locator('.user-show > .user-show__header');
  await expect(header).toHaveAttribute('data-lr-ext-avatar-color', avatarOf('DrNykterstein').color);
  await expect
    .poll(() => computedStyle(header, 'background-image', '::before'))
    .toMatch(stillOf('DrNykterstein'));

  await openLichess(
    page,
    '/forum/general-chess-discussion/do-you-prefer-ultrabullet-or-hyperbullet',
  );
  const post = page.locator('main.forum-topic .forum-post').first();
  const author = post.locator('.forum-post__metas > a.author');
  const user = (await author.getAttribute('href'))?.split('/')[2] ?? '';
  await expect
    .poll(() => computedStyle(post, 'background-image', '::before'))
    .toMatch(stillOf(user));
  await author.hover();
  const card = page.locator('#powerTip .upt__info');
  await expect(card).toHaveAttribute('data-lr-ext-avatar-coach', String(avatarOf(user).coach));
  await expect
    .poll(() => computedStyle(card, 'background-image', '::before'))
    .toMatch(stillOf(user));
});

test('a game’s players get their avatars in their bars', async ({ page }) => {
  await openLichess(page, USERS_GAME);
  const bars = page.locator('main.analyse > .lr-ext-player');
  await expect(bars).toHaveCount(2);
  for (const bar of await bars.all()) {
    const href = await bar.locator('a.user-link').getAttribute('href');
    const user = href?.split('/')[2] ?? '';
    await expect(bar).toHaveAttribute('data-lr-ext-avatar-color', avatarOf(user).color);
    await expect
      .poll(() => computedStyle(bar, 'background-image', '::before'))
      .toMatch(stillOf(user));
  }
});
