import type { Page } from '@playwright/test';
import { COACH_COUNT } from '#shared/coach.ts';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { expect, test } from './fixtures.ts';
import { FINISHED_GAME, openLichess, storedValue } from './support/lichess.ts';
import { activePly, mainlineMoves, ownVariations } from './support/move-list.ts';
import { REVIEW_CACHE, reviewParts, seedReviewCache, VERDICT } from './support/review.ts';

// The Game Review of a finished game, from its cache: the verdicts are then
// the same on every run, but the tests only lean on the review's structure.

const ACCURACY = /^\d{1,3}\.\d$/;
const PLIES = REVIEW_CACHE.records.length - 1;

const htmlClass = (page: Page, name: string): Promise<void> =>
  expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${name}(\\s|$)`));

/** Starts the move-by-move review from the summary. */
async function startReview(page: Page): Promise<void> {
  const { start } = reviewParts(page);
  await expect(start).toBeEnabled();
  await start.click();
  await htmlClass(page, 'lr-ext-review-moves');
}

/** Goes on with Next until the Best button can show a better move. */
async function nextToBestable(page: Page): Promise<number> {
  const { best, next } = reviewParts(page);
  for (let step = 0; step < PLIES; step++) {
    if (await best.isEnabled()) return activePly(page);
    const ply = await activePly(page);
    await next.click();
    await expect.poll(() => activePly(page)).toBe(ply + 1);
  }
  throw new Error('no move of the game needed a correction');
}

test.describe('the Game Review of a finished game', () => {
  test.beforeEach(async ({ context, page }) => {
    await seedReviewCache(context);
    await openLichess(page, FINISHED_GAME.path);
    await htmlClass(page, 'lr-ext-review-summary');
  });

  test('opens on its summary: the graph, accuracy, counts and game rating', async ({ page }) => {
    const { panel, start } = reviewParts(page);
    await expect(panel.locator('.lr-ext-summary-graph svg path').first()).toBeAttached();
    await expect(panel.locator('.lr-ext-summary-graph svg circle').first()).toBeAttached();
    // From the cache the analysis is complete at once: no progress left to show.
    await expect(panel.locator('.lr-ext-summary-pct')).toHaveCount(0);
    await expect(panel.locator('.lr-ext-review__top .lr-ext-acc--w')).toHaveText(ACCURACY);
    await expect(panel.locator('.lr-ext-review__top .lr-ext-acc--b')).toHaveText(ACCURACY);
    await expect(panel.locator('.lr-ext-t-rating .lr-ext-acc--w')).toHaveText(/^\d{3,4}$/);
    await expect(panel.locator('.lr-ext-t-rating .lr-ext-acc--b')).toHaveText(/^\d{3,4}$/);
    await expect(start).toBeEnabled();

    // With every row shown, each side's counts add up to its moves.
    await panel.locator('.lr-ext-review__more').click();
    const rows = panel.locator('.lr-ext-review__body tr:has(.lr-ext-t-num)');
    await expect(rows).toHaveCount(MOVE_CLASSES.length);
    const counts = await rows.evaluateAll(trs =>
      trs.map(tr =>
        [...tr.querySelectorAll('.lr-ext-t-num')].map(cell => Number(cell.textContent)),
      ),
    );
    const total = (column: number): number =>
      counts.reduce((sum, row) => sum + (row[column] ?? 0), 0);
    expect(total(0)).toBe(Math.ceil(PLIES / 2));
    expect(total(1)).toBe(Math.floor(PLIES / 2));
  });

  test('Start Review goes to the first move, with the coach’s verdict on it', async ({ page }) => {
    const { bubbleTitle, comment, avatar, badge, evalBar } = reviewParts(page);
    await startReview(page);
    expect(await activePly(page)).toBe(1);
    const firstMove = (await mainlineMoves(page).first().locator('san').textContent()) ?? '';
    await expect(bubbleTitle).toContainText(firstMove);
    await expect(comment).not.toBeEmpty();
    await expect(avatar).toHaveAttribute('data-lr-ext-mood', /\w/);
    await expect(badge).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-lr-ext-cls', VERDICT);
    await expect(evalBar).toBeVisible();
    // "1.3" or "M3": the bar's own side says who's better.
    await expect(evalBar.locator('.lr-ext-evalbar__label')).toHaveText(/^(\d+\.\d|M\d+)$/);
    await expect(evalBar.locator('.lr-ext-evalbar__fill')).toHaveAttribute(
      'style',
      /height: [\d.]+%/,
    );
  });

  test('a count goes to its moves, the next one on each click', async ({ page }) => {
    const { panel } = reviewParts(page);
    const counts = panel.locator('.lr-ext-t-jump');
    await expect(counts.first()).toBeVisible();
    const numbers = await counts.evaluateAll(buttons =>
      buttons.map(button => Number(button.textContent)),
    );
    const index = numbers.findIndex(count => count > 1);
    expect(index).toBeGreaterThanOrEqual(0);
    const count = counts.nth(index);
    const moveClass = (await count.getAttribute('data-lr-ext-class')) ?? '';
    const parity = (await count.getAttribute('data-lr-ext-color')) === 'white' ? 1 : 0;
    const plies: number[] = [];
    // Back on the summary between clicks, as a user would come back to it.
    for (let click = 0; click < 2; click++) {
      await count.click();
      await htmlClass(page, 'lr-ext-review-moves');
      await expect(page.locator('html')).toHaveAttribute('data-lr-ext-cls', moveClass);
      plies.push(await activePly(page));
      await panel.locator('.lr-ext-review__back').click();
      await htmlClass(page, 'lr-ext-review-summary');
    }
    expect(plies.map(ply => ply % 2)).toEqual([parity, parity]);
    expect(plies[1]).toBeGreaterThan(plies[0] ?? Infinity);
  });

  test('Next, Prev, First and Last move through the game', async ({ page }) => {
    const { next, controls, comment, badge } = reviewParts(page);
    const control = (action: string) => controls.locator(`[data-lr-ext="${action}"]`);
    await startReview(page);
    await next.click();
    await expect.poll(() => activePly(page)).toBe(2);
    await control('next').click();
    await expect.poll(() => activePly(page)).toBe(3);
    await control('prev').click();
    await expect.poll(() => activePly(page)).toBe(2);
    await control('last').click();
    await expect.poll(() => activePly(page)).toBe(PLIES);
    await expect(next).toBeDisabled();
    await control('first').click();
    await expect.poll(() => activePly(page)).toBe(0);
    // Before the first move there's nothing to judge.
    await expect(comment).toHaveCount(0);
    await expect(badge).toHaveCount(0);
  });

  test('Best plays the engine’s move where the one played needed a correction', async ({
    page,
  }) => {
    const { best, arrows } = reviewParts(page);
    await startReview(page);
    const played = await nextToBestable(page);
    // The better move, as a green arrow over the one played.
    await expect(arrows.first()).toHaveAttribute('fill', /159,207,63/);
    await best.click();
    await expect(best).toHaveClass(/\blr-ext-btn--on\b/);
    await expect(page.locator('html')).toHaveAttribute('data-lr-ext-cls', 'best');
    await expect(ownVariations(page)).toHaveCount(1);
    await best.click();
    await expect(best).not.toHaveClass(/\blr-ext-btn--on\b/);
    await expect.poll(() => activePly(page)).toBe(played);
    await expect(page.locator('html')).not.toHaveAttribute('data-lr-ext-cls', 'best');
  });

  test('Explain writes the engine’s best line, and plays it on the board', async ({ page }) => {
    const { panel, comment, explain } = reviewParts(page);
    const lineButton = panel.locator('.lr-ext-bubble__line');
    await startReview(page);
    const played = await nextToBestable(page);
    await explain.click();
    await expect(explain).toHaveClass(/\blr-ext-btn--on\b/);
    // The engine boots, then plays the lines out from the cached verdict's best move.
    await expect(lineButton).toHaveText('Show line', { timeout: 30_000 });
    await expect(comment).toHaveText(/^Best was \d+\.(\.\.)? /);
    await lineButton.click();
    await expect(ownVariations(page)).toHaveCount(1);
    await expect(lineButton).toHaveText('Back');
    const lineMoves = ownVariations(page).locator('move');
    await expect.poll(() => lineMoves.count()).toBeGreaterThanOrEqual(2);
    await lineButton.click();
    await expect.poll(() => activePly(page)).toBe(played);
    await expect(lineButton).toHaveText('Show line');
  });

  test('marks every move of the game in Lichess’s move list', async ({ page }) => {
    const moves = mainlineMoves(page);
    await expect(moves).toHaveCount(PLIES);
    await expect(moves.and(page.locator('[data-lr-ext-cls]'))).toHaveCount(PLIES);
    const verdicts = await moves.evaluateAll(list => list.map(move => move.dataset.lrExtCls ?? ''));
    for (const verdict of verdicts) expect(verdict).toMatch(VERDICT);
    const badged = moves.and(page.locator('[data-lr-ext-badge]'));
    await expect(badged.first()).toHaveAttribute(
      'style',
      /--lr-ext-class-icon: url\("data:image\/svg\+xml/,
    );
  });

  test('closes to Lichess’s panel, and opens again', async ({ page }) => {
    const { close, reopen } = reviewParts(page);
    await close.click();
    await htmlClass(page, 'lr-ext-review-normal');
    await expect(page.locator('main.analyse .analyse__moves')).toBeVisible();
    await expect(reopen).toBeVisible();
    await expect(page.locator('#lr-ext-review .lr-ext-review__counts')).toBeAttached();
    await reopen.click();
    await htmlClass(page, 'lr-ext-review-summary');
    await expect(reviewParts(page).start).toBeVisible();
  });

  test('leaves "Learn from your mistakes" to Lichess’s sign-in, signed out', async ({ page }) => {
    // The game has no server analysis, which only a signed-in user may request.
    await reviewParts(page).panel.locator('[data-lr-ext="learn"]').click();
    await expect(page.locator('dialog')).toBeVisible();
    await htmlClass(page, 'lr-ext-review-summary');
  });

  test('changes coach on a click on the coach, for the next reviews too', async ({ page }) => {
    const { avatar } = reviewParts(page);
    await startReview(page);
    // The content script plays the coach's face over the portrait.
    await expect(avatar).toHaveClass(/\blr-ext-coach__avatar--rig\b/);
    await expect(avatar.locator('.lr-ext-coach__rig svg').first()).toBeAttached();
    const coach = Number(await avatar.getAttribute('data-lr-ext-coach-id'));
    const nextCoach = (coach % COACH_COUNT) + 1;
    await avatar.click();
    await expect(avatar).toHaveAttribute('data-lr-ext-coach-id', String(nextCoach));
    expect(await storedValue(page, 'lr-ext-coach')).toBe(String(nextCoach));
    await page.reload({ waitUntil: 'load' });
    await startReview(page);
    await expect(reviewParts(page).avatar).toHaveAttribute(
      'data-lr-ext-coach-id',
      String(nextCoach),
    );
  });
});

test('"Learn from your mistakes" closes the review for Lichess’s exercise', async ({ page }) => {
  // A game with Lichess's server analysis, which the exercise needs.
  await openLichess(page, '/kAdOQKeh/black');
  await htmlClass(page, 'lr-ext-review-summary');
  await reviewParts(page).panel.locator('[data-lr-ext="learn"]').click();
  await htmlClass(page, 'lr-ext-review-normal');
  await expect(page.locator('main.analyse .analyse__tools > .retro-box')).toBeVisible();
});

test('offers no "Learn from your mistakes" on a game too short for Lichess to analyse', async ({
  page,
}) => {
  // Fool's mate, imported: Lichess analyses only games of more than 4 moves.
  await openLichess(page, '/60X0LpG9');
  await htmlClass(page, 'lr-ext-review-summary');
  await expect(reviewParts(page).start).toBeEnabled();
  await expect(reviewParts(page).panel.locator('[data-lr-ext="learn"]')).toHaveCount(0);
});
