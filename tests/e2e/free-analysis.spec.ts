import { expect, test } from './fixtures.ts';
import { clickMove } from './support/board.ts';
import { openLichess } from './support/lichess.ts';
import { reviewParts, VERDICT } from './support/review.ts';

// The free analysis board: the coach judges each move as it's played, with
// the same engine as the review, booted in the page.

// Booting the engine takes a few seconds, more on a busy machine.
const JUDGING_MS = 60_000;

test('the coach judges a move played on the free analysis board', async ({ page }) => {
  const { bubbleTitle, comment, badge } = reviewParts(page);
  await openLichess(page, '/analysis');
  await expect(page.locator('html')).toHaveClass(/\blr-ext-review-live\b/);
  // Before a move, an invitation to play one.
  await expect(bubbleTitle).not.toBeEmpty();
  await expect(comment).toHaveCount(0);

  await clickMove(page, 'e2', 'e4');
  const played = page.locator('main.analyse .tview2 move').first();
  await expect(played).toHaveClass(/\bactive\b/);
  await expect(bubbleTitle).toContainText('e4', { timeout: JUDGING_MS });
  await expect(comment).not.toBeEmpty();
  await expect(played).toHaveAttribute('data-lr-ext-cls', VERDICT);
  await expect(badge).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-lr-ext-cls', VERDICT);

  // And the reply, judged in turn.
  await clickMove(page, 'e7', 'e5');
  await expect(bubbleTitle).toContainText('e5', { timeout: JUDGING_MS });
  await expect(page.locator('main.analyse .tview2 move[data-lr-ext-cls]')).toHaveCount(2);
});
