import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { boardWrap, orientationOf } from './support/board.ts';
import { boxOf, expectInView } from './support/layout.ts';
import { computedStyle, openLichess } from './support/lichess.ts';
import { onOneTvGame, waitForRoundKeys } from './support/tv.ts';

// A game being played, on Lichess TV. Which game it is changes all the time:
// nothing here depends on its players, its moves or its clock, and each test
// runs again if TV reloads the page with another game.

interface CapturedCount {
  /** How many pieces each side has lost, counted off the board. */
  readonly expected: number;
  /** The pieces the two bars show. */
  readonly shown: number;
}

/** Counts both in one go: the board may move on between two reads. */
function capturedCount(page: Page): Promise<CapturedCount> {
  return page.evaluate(() => {
    const START: Record<string, number> = { pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1 };
    const board = document.querySelector('main.round .round__app__board cg-board');
    const pieces = [...(board?.querySelectorAll('piece:not(.ghost):not(.fading)') ?? [])];
    let expected = 0;
    for (const color of ['white', 'black'])
      for (const [role, count] of Object.entries(START)) {
        const left = pieces.filter(
          piece => piece.classList.contains(color) && piece.classList.contains(role),
        ).length;
        expected += Math.max(0, count - left);
      }
    const shown = document.querySelectorAll('main.round .lr-ext-captured .lr-ext-pc').length;
    return { expected, shown };
  });
}

test.describe('a game on Lichess TV', () => {
  test.beforeEach(async ({ page }) => {
    await openLichess(page, '/tv');
    await expect(page.locator('main.round .round__app__board cg-board')).toBeVisible();
  });

  test('has player bars with avatars, and clocks', async ({ page }) => {
    await onOneTvGame(page, async () => {
      for (const side of ['top', 'bottom']) {
        const bar = page.locator(`main.round .ruser-${side}`);
        await expect(bar).toBeVisible();
        await expect(bar.locator('a.user-link')).toBeVisible();
        expect(await computedStyle(bar, 'background-image', '::before')).toMatch(/^url\(/);
        expect(await computedStyle(bar, 'width', '::before')).not.toBe('0px');
        await expect(page.locator(`main.round .rclock-${side} .time`)).toHaveText(/\d+:\d\d/);
      }
    });
  });

  test('shows the captured pieces in the player bars, in the board’s set', async ({ page }) => {
    await onOneTvGame(page, async () => {
      await expect(page.locator('main.round .lr-ext-captured--top')).toBeAttached();
      await expect(page.locator('main.round .lr-ext-captured--bottom')).toBeAttached();
      await expect
        .poll(async () => {
          const { expected, shown } = await capturedCount(page);
          return shown === expected;
        })
        .toBe(true);
      // Lichess's own pieces, from the variables it draws the board's from.
      for (const piece of await page.locator('main.round .lr-ext-captured .lr-ext-pc').all())
        await expect(piece).toHaveCSS(
          'background-image',
          /^url\("https:\/\/lichess1\.org\/assets\//,
        );
    });
  });

  test('flips the board with its flip button, shown while the pointer is on the board', async ({
    page,
  }) => {
    const flip = page.locator('main.round .lr-ext-board-tools__btn--flip');
    await onOneTvGame(page, async () => {
      // After a reload the pointer may still be over the board.
      await page.mouse.move(0, 0);
      await expect(flip).toBeHidden();
      await expect(flip).toHaveAttribute('aria-label', /\w/);
      await page.locator('main.round .round__app__board cg-board').hover();
      await expect(flip).toBeVisible();
      await waitForRoundKeys(page, ['f']);
      const before = await orientationOf(page);
      await flip.click();
      await expect(boardWrap(page)).toHaveClass(
        before === 'white' ? /\borientation-black\b/ : /\borientation-white\b/,
      );
    });
  });

  test('opens Lichess’s board menu with its cog', async ({ page }) => {
    const cog = page.locator('main.round .lr-ext-board-tools__btn--menu');
    await onOneTvGame(page, async () => {
      await expect(cog).toBeVisible();
      await waitForRoundKeys(page, ['h']);
      await cog.click();
      await expect(page.locator('main.round .board-menu')).toBeVisible();
      await expect(cog).toHaveClass(/\blr-ext-board-tools__btn--on\b/);
    });
  });

  test('shows the game’s info as a card: pills, names and bare ratings', async ({ page }) => {
    const meta = page.locator('main.round .round__side > .game__meta');
    await onOneTvGame(page, async () => {
      await expect(meta).toBeVisible();
      await expect(meta.locator('.setup[data-lr-ext-parts] .lr-ext-part').first()).toBeVisible();
      const players = meta.locator('.game__meta__players .user-link[data-lr-ext-name]');
      await expect(players).toHaveCount(2);
      for (const player of await players.all()) {
        await expect(player.locator('.lr-ext-meta-name')).not.toBeEmpty();
        // A provisional rating keeps its "?"; the brackets go.
        await expect(player.locator('.rating')).toHaveText(/^\d+\??$/);
      }
    });
  });

  test('shows the players’ crosstable under the move buttons', async ({ page }) => {
    const crosstable = page.locator('main.round .round__underboard > .crosstable');
    await onOneTvGame(page, async () => {
      await expectInView(page, crosstable);
      const buttons = await boxOf(page.locator('main.round :is(i5d, rm6) bo3'));
      expect((await boxOf(crosstable)).top).toBeGreaterThanOrEqual(buttons.bottom - 1);
    });
  });

  test('shows the score of the players’ match as a pill', async ({ page }) => {
    const crosstable = page.locator('main.round .round__underboard > .crosstable');
    await onOneTvGame(page, async () => {
      await expectInView(page, crosstable);
      // Lichess adds it only while the players are in a match: one like it.
      const background = await crosstable.evaluate(element => {
        const matchup = document.createElement('div');
        matchup.className = 'crosstable__matchup';
        element.append(matchup);
        return getComputedStyle(matchup).backgroundColor;
      });
      expect(background).not.toBe('rgba(0, 0, 0, 0)');
    });
  });
});
