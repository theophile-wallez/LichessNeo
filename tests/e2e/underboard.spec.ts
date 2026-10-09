import { expect, test } from './fixtures.ts';
import { expectInView, wheelScroll } from './support/layout.ts';
import { FINISHED_GAME, openLichess } from './support/lichess.ts';

// What Lichess shows under the board, which our layout keeps in the panel,
// behind a button of the controls: the page itself never scrolls.

/** A finished game with Lichess's server analysis, and so its advice summary. */
const ANALYSED_GAME = '/kAdOQKeh/black';
const STUDY = '/study/2Zl6MgFH';

const BUTTON = '.analyse__controls > .lr-ext-underboard';
const UNDERBOARD = 'main.analyse > .analyse__underboard';

test('the free board takes a pasted PGN, and shows the position’s FEN', async ({ page }) => {
  await openLichess(page, '/analysis');
  const fields = page.locator(UNDERBOARD);
  await expect(fields).toBeHidden();
  await page.locator(BUTTON).click();
  await expect(fields).toBeVisible();
  await fields.locator('.pgn textarea').fill('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
  await fields.locator('.pgn button').click();
  await expect(fields.locator('.copyables input')).toHaveValue(
    'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
  );
  await page.locator(BUTTON).click();
  await expect(fields).toBeHidden();
});

test('a game without server analysis offers to request one', async ({ page }) => {
  await openLichess(page, FINISHED_GAME.path);
  await page.locator('.lr-ext-review__close').click();
  await page.locator(BUTTON).click();
  const underboard = page.locator(UNDERBOARD);
  await underboard.locator('.analyse__underboard__menu > .computer-analysis').click();
  await expectInView(page, underboard.locator('form.future-game-analysis button'));
  expect(await wheelScroll(page)).toBe(0);
});

test('an analysed game shows its charts and "Learn from your mistakes"', async ({ page }) => {
  await openLichess(page, ANALYSED_GAME);
  await page.locator('.lr-ext-review__close').click();
  await page.locator(BUTTON).click();
  await expectInView(page, page.locator(`${UNDERBOARD} .analyse__underboard__menu`));
  const learn = page.locator('main.analyse > .analyse__round-training .advice-summary a.button');
  await expectInView(page, learn);
  expect(await wheelScroll(page)).toBe(0);
  // The exercise runs in the tools, which the underboard would cover.
  await learn.click();
  await expect(page.locator('.analyse__tools > .retro-box')).toBeVisible();
  await expect(page.locator(UNDERBOARD)).toBeHidden();
});

test('a game’s charts are ours, and a click on one goes to its move', async ({ page }) => {
  await openLichess(page, ANALYSED_GAME);
  await page.locator('.lr-ext-review__close').click();
  await page.locator(BUTTON).click();
  const menu = page.locator(`${UNDERBOARD} .analyse__underboard__menu`);
  await menu.locator('[data-panel="computer-analysis"]').click();
  const advantage = page.locator('#acpl-chart-container');
  await expect(advantage.locator('.lr-ext-gchart .lr-ext-gchart__line')).toHaveAttribute('d', /^M/);
  await expect(advantage.locator('canvas')).toBeHidden();
  await menu.locator('[data-panel="move-times"]').click();
  const times = page.locator('#movetimes-chart-container');
  await expect(times.locator('.lr-ext-gchart__bar--white').first()).toBeVisible();
  await expect(times.locator('canvas')).toBeHidden();
  const plot = await times.locator('.lr-ext-gchart svg').boundingBox();
  if (!plot) throw new Error('no move times chart');
  await page.mouse.click(plot.x + plot.width / 2, plot.y + plot.height / 2);
  await expect(times.locator('.lr-ext-gchart__ply')).toHaveClass(/\blr-ext-gchart__ply--on\b/);
  await expect(times.locator('.lr-ext-rchart__tip')).toContainText(/\d+\.{1,3} \S+/);
  expect(await wheelScroll(page)).toBe(0);
});

test('the exercise’s spinner stays in its tile', async ({ page }) => {
  await openLichess(page, ANALYSED_GAME);
  await page.locator('.lr-ext-review__close').click();
  await page.locator(BUTTON).click();
  await page.locator('main.analyse > .analyse__round-training .advice-summary a.button').click();
  const player = page.locator('.analyse__tools > .retro-box .player').first();
  await player.waitFor();
  // While it waits for an evaluation, Lichess shows its spinner (lila's spinnerVdom) as the icon.
  const [tile, spinner] = await player.evaluate(element => {
    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.innerHTML = '<div class="spinner"><svg viewBox="-2 -2 54 54"></svg></div>';
    element.prepend(icon);
    return [icon, icon.firstElementChild].map(part => {
      const rect = part?.getBoundingClientRect();
      return rect ? [rect.left, rect.top, rect.right, rect.bottom] : [];
    });
  });
  const [left = 0, top = 0, right = 0, bottom = 0] = tile ?? [];
  const [ownLeft = 0, ownTop = 0, ownRight = 0, ownBottom = 0] = spinner ?? [];
  expect(spinner).toHaveLength(4);
  expect([ownLeft >= left, ownTop >= top, ownRight <= right, ownBottom <= bottom]).toEqual([
    true,
    true,
    true,
    true,
  ]);
});

test('a game’s tabs keep their whole names, and its crosstable spans the panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openLichess(page, ANALYSED_GAME);
  await page.locator('.lr-ext-review__close').click();
  await page.locator(BUTTON).click();
  const menu = page.locator(`${UNDERBOARD} .analyse__underboard__menu`);
  await menu.locator('[data-panel="ctable"]').click();
  const cut = await menu.evaluate(bar =>
    [...bar.children].filter(tab => tab.scrollWidth > tab.clientWidth).map(tab => tab.textContent),
  );
  expect(cut).toEqual([]);
  const crosstable = page.locator(`${UNDERBOARD} .crosstable`);
  await expectInView(page, crosstable);
  const panel = await page.locator(`${UNDERBOARD} .analyse__underboard__panels`).boundingBox();
  expect((await crosstable.boundingBox())?.width).toBeCloseTo(panel?.width ?? 0, 0);
});

test('a study shows its toolbar', async ({ page }) => {
  await openLichess(page, STUDY);
  await page.locator(BUTTON).click();
  await expectInView(page, page.locator(`${UNDERBOARD} .study__buttons`));
  expect(await wheelScroll(page)).toBe(0);
});
