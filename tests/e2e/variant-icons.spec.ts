import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';
import { onOneTvGame } from './support/tv.ts';

// theme/ draws Atomic, Antichess and Horde as Hugeicons. The white tiles must keep
// them: Lichess's glyph under the Hugeicon's mask shows as odd scraps.

const VARIANTS = [
  { key: 'antichess', glyph: '\ue01e', icon: 'exchange-01' },
  { key: 'atomic', glyph: '\ue01c', icon: 'atom-01' },
  { key: 'horde', glyph: '\ue03d', icon: 'user-multiple' },
] as const;

const WHITE = 'rgb(255, 255, 255)';

async function expectHugeicon(glyph: Locator, icon: string): Promise<void> {
  await expect(glyph).toBeAttached();
  expect(await computedStyle(glyph, 'content', '::before')).toBe('""');
  expect(await computedStyle(glyph, 'mask-image', '::before')).toContain(`/${icon}.svg`);
  expect(await computedStyle(glyph, 'background-color', '::before')).toBe(WHITE);
}

function iconOf(page: Page, scope: string, glyph: string): Locator {
  return page.locator(`${scope}[data-icon="${glyph}"]`).first();
}

test('TV’s channels show the variants’ Hugeicons', async ({ page }) => {
  await openLichess(page, '/tv');
  for (const { key, glyph, icon } of VARIANTS)
    await expectHugeicon(iconOf(page, `main.tv-single a.tv-channel.${key} > span`, glyph), icon);
});

test('the leaderboards show the variants’ Hugeicons', async ({ page }) => {
  await openLichess(page, '/player');
  for (const { glyph, icon } of VARIANTS)
    await expectHugeicon(iconOf(page, '.community .leaderboards h2', glyph), icon);
});

test('a variant game’s card shows its Hugeicon', async ({ page }) => {
  await openLichess(page, '/tv/atomic');
  const { glyph, icon } = VARIANTS[1];
  await onOneTvGame(page, () =>
    expectHugeicon(iconOf(page, 'main.round .game__meta__infos', glyph), icon),
  );
});
