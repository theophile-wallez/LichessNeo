import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import {
  expectInView,
  expectLinedUp,
  horizontalOverflow,
  wheelScroll,
  type BoardNeighbour,
} from './support/layout.ts';
import { FINISHED_GAME, openLichess, rootVariable } from './support/lichess.ts';
import { seedReviewCache } from './support/review.ts';
import { expectLichessHeader } from './support/sidebar.ts';
import { onOneTvGame } from './support/tv.ts';

// The pages that must fit the window like an app, at the sizes users have,
// and Lichess's mobile layout below 1020px.

interface Size {
  readonly width: number;
  readonly height: number;
}

const DESKTOP_SIZES: readonly Size[] = [
  { width: 1024, height: 768 },
  // The narrowest a puzzle or a Swiss tournament must fit in.
  { width: 1260, height: 800 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
const MOBILE_SIZES: readonly Size[] = [
  { width: 1019, height: 800 },
  { width: 390, height: 800 },
];

interface FittedPage {
  readonly name: string;
  /** The narrowest window it must fit in without scrolling. */
  readonly fromWidth: number;
  /** What must be entirely in view. */
  readonly shown: string;
  readonly open: (page: Page, context: BrowserContext) => Promise<void>;
  /** Runs the checks on one page: TV reloads onto another game at any time. */
  readonly onOnePage?: (page: Page, steps: () => Promise<void>) => Promise<void>;
}

const BOARD = 'main .main-board cg-container';

async function openTv(page: Page): Promise<void> {
  await openLichess(page, '/tv');
}

/** Runs `steps` on one TV game, once its board is in. */
function onTvBoard(page: Page, steps: () => Promise<void>): Promise<void> {
  return onOneTvGame(page, async () => {
    await expect(page.locator(BOARD)).toBeVisible();
    await steps();
  });
}

const onlyPage = (_page: Page, steps: () => Promise<void>): Promise<void> => steps();

async function openAnalysis(page: Page, context: BrowserContext): Promise<void> {
  // From the cache, the review's eval bar is there at once.
  await seedReviewCache(context);
  await openLichess(page, FINISHED_GAME.path);
  await expect(page.locator(BOARD)).toBeVisible();
}

// Tournaments come and go: any on the Swiss home page will do.
async function openSwissTournament(page: Page): Promise<void> {
  await openLichess(page, '/swiss');
  const links = page.locator('main.swiss-home a[href^="/swiss/"]');
  const paths = await links.evaluateAll(anchors =>
    anchors.map(anchor => anchor.getAttribute('href') ?? ''),
  );
  const path = paths.find(href => /^\/swiss\/[A-Za-z0-9]{8}$/.test(href));
  if (path === undefined) throw new Error('no Swiss tournament listed');
  await openLichess(page, path);
  await expect(page.locator('main.swiss')).toBeVisible();
}

const FITTED_PAGES: readonly FittedPage[] = [
  {
    name: 'a game on TV',
    fromWidth: 1020,
    shown: 'main.round',
    open: openTv,
    onOnePage: onTvBoard,
  },
  { name: 'a game’s analysis', fromWidth: 1020, shown: 'main.analyse', open: openAnalysis },
  {
    name: 'a puzzle',
    fromWidth: 1260,
    shown: 'main.puzzle',
    open: async page => {
      await openLichess(page, '/training');
      await expect(page.locator(BOARD)).toBeVisible();
    },
  },
  { name: 'a Swiss tournament', fromWidth: 1260, shown: 'main.swiss', open: openSwissTournament },
];

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

const TV_BARS: BarSelectors = {
  bar: side => `main.round .ruser-${side}`,
  clock: side => `main.round .rclock-${side}`,
};
const ANALYSIS_BARS: BarSelectors = {
  bar: side => `main.analyse > .lr-ext-player--${side}`,
  clock: side => `main.analyse .analyse__clock.${side}`,
};

// The scroll probe's "doesn't scroll" means nothing unless it can see a page that does.
test('the scroll probe sees a page that scrolls', async ({ page }) => {
  await openLichess(page, '/');
  expect(await wheelScroll(page)).toBeGreaterThan(0);
});

for (const size of DESKTOP_SIZES) {
  test.describe(`at ${size.width}×${size.height}`, () => {
    test.use({ viewport: size });

    for (const { name, fromWidth, shown, open, onOnePage = onlyPage } of FITTED_PAGES) {
      if (size.width < fromWidth) continue;
      test(`${name} fits the window and doesn't scroll`, async ({ page, context }) => {
        await open(page, context);
        await onOnePage(page, async () => {
          await expectInView(page, page.locator(shown));
          expect(await horizontalOverflow(page)).toBe(0);
          expect(await wheelScroll(page)).toBe(0);
        });
      });
    }

    test('on TV, the player bars and the clocks line up with the board', async ({ page }) => {
      await openTv(page);
      await onTvBoard(page, () => expectLinedUp(page.locator(BOARD), barsAndClocks(page, TV_BARS)));
    });

    test('on an analysis, the bars, clocks and eval bar line up with the board', async ({
      page,
      context,
    }) => {
      await openAnalysis(page, context);
      const evalBar = page.locator('#lr-ext-evalbar');
      await expect(evalBar).toBeVisible();
      await expectLinedUp(page.locator(BOARD), [
        ...barsAndClocks(page, ANALYSIS_BARS),
        { name: 'the eval bar', locator: evalBar, edges: ['top', 'bottom'], side: 'left' },
      ]);
    });
  });
}

for (const size of MOBILE_SIZES) {
  test.describe(`at ${size.width}×${size.height}, Lichess’s mobile layout`, () => {
    test.use({ viewport: size });

    test('stays on a game, in our colors', async ({ page }) => {
      await openTv(page);
      await onTvBoard(page, async () => {
        await expectLichessHeader(page);
        expect(await rootVariable(page, '--lr-ext-bg-panel')).toBe('#262522');
        expect(await horizontalOverflow(page)).toBe(0);
      });
    });

    test('stays on an analysis, without the review’s panel', async ({ page, context }) => {
      await openAnalysis(page, context);
      await expectLichessHeader(page);
      // It has no room there: the board stays Lichess's.
      await expect(page.locator('#lr-ext-review')).toBeAttached();
      await expect(page.locator('#lr-ext-review')).toBeHidden();
      await expect(page.locator('#lr-ext-board-overlay .lr-ext-badge')).toHaveCount(0);
      expect(await horizontalOverflow(page)).toBe(0);
    });
  });
}
