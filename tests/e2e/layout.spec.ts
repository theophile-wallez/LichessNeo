import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import {
  expectInView,
  expectLinedUp,
  horizontalOverflow,
  wheelScroll,
  type BoardNeighbour,
} from './support/layout.ts';
import { FINISHED_GAME, openLichess } from './support/lichess.ts';
import { seedReviewCache } from './support/review.ts';
import { onOneTvGame } from './support/tv.ts';

// A game and its analysis fit the window like an app, their bars in line with
// the board, and a phone gets a page that scrolls but never overflows sideways.

const BOARD = 'main .main-board cg-container';

type Side = 'top' | 'bottom';
const SIDES: readonly Side[] = ['top', 'bottom'];

interface BarSelectors {
  readonly bar: (side: Side) => string;
  readonly clock: (side: Side) => string;
}

/** Each side's player bar on the board's left edge, its clock on the right one. */
function barsAndClocks(page: Page, { bar, clock }: BarSelectors): BoardNeighbour[] {
  return SIDES.flatMap(side => {
    const place = side === 'top' ? 'above' : 'below';
    return [
      {
        name: `the ${side} player bar`,
        locator: page.locator(bar(side)),
        edges: ['left'],
        side: place,
      },
      {
        name: `the ${side} clock`,
        locator: page.locator(clock(side)),
        edges: ['right'],
        side: place,
      },
    ];
  });
}

async function expectFitted(page: Page, shown: string): Promise<void> {
  await expectInView(page, page.locator(shown));
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await wheelScroll(page)).toBe(0);
}

test('a game on TV fits the window, its bars and clocks in line with the board', async ({
  page,
}) => {
  await openLichess(page, '/tv');
  // TV reloads onto another game at any time: the checks run on one.
  await onOneTvGame(page, async () => {
    await expect(page.locator(BOARD)).toBeVisible();
    await expectFitted(page, 'main.round');
    await expectLinedUp(
      page.locator(BOARD),
      barsAndClocks(page, {
        bar: side => `main.round .ruser-${side}`,
        clock: side => `main.round .rclock-${side}`,
      }),
    );
  });
});

test('a game’s analysis fits the window, its bars, clocks and eval bar in line with the board', async ({
  page,
  context,
}) => {
  // From the cache, the review's eval bar is there at once.
  await seedReviewCache(context);
  await openLichess(page, FINISHED_GAME.path);
  await expect(page.locator(BOARD)).toBeVisible();
  await expectFitted(page, 'main.analyse');
  const evalBar = page.locator('#lr-ext-evalbar');
  await expect(evalBar).toBeVisible();
  await expectLinedUp(page.locator(BOARD), [
    ...barsAndClocks(page, {
      bar: side => `main.analyse > .lr-ext-player--${side}`,
      clock: side => `main.analyse .analyse__clock.${side}`,
    }),
    { name: 'the eval bar', locator: evalBar, edges: ['top', 'bottom'], side: 'left' },
  ]);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // That it scrolls also shows the scroll probe can see a page that does.
  test('the home scrolls, and nothing overflows sideways', async ({ page }) => {
    await openLichess(page, '/');
    await expect(page.locator('.lr-ext-speed')).toHaveCount(4);
    expect(await horizontalOverflow(page)).toBe(0);
    expect(await wheelScroll(page)).toBeGreaterThan(0);
  });
});
