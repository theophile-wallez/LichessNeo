import { expect, test } from './fixtures.ts';
import { FINISHED_GAME, openLichess } from './support/lichess.ts';
import { reviewParts, seedReviewCache } from './support/review.ts';

// In French: Lichess serves its pages in the browser's language, and what
// the extension writes follows the page's.

test.use({ locale: 'fr-FR' });

test('the home page’s hero speaks French', async ({ page }) => {
  await openLichess(page, '/');
  await expect(page.locator('html')).toHaveAttribute('lang', /^fr/);
  const hero = page.locator('main.lobby > .lr-ext-hero');
  await expect(hero.locator('.lr-ext-hero__title')).toHaveText('Jouer aux échecs en ligne');
  await expect(hero.locator('.lr-ext-hero__eyebrow')).toHaveText(
    'Gratuit · Sans publicité · Open source',
  );
});

test('the Game Review speaks French', async ({ context, page }) => {
  const { panel, start, next, explain } = reviewParts(page);
  await seedReviewCache(context);
  await openLichess(page, FINISHED_GAME.path);
  await expect(panel.locator('.lr-ext-review__title')).toHaveText('★Bilan');
  await expect(start).toHaveText('Démarrer le bilan');
  await expect(panel.locator('.lr-ext-review__top .lr-ext-t-label').first()).toHaveText('Joueurs');
  await start.click();
  await expect(next).toHaveText('Suivant');
  await expect(explain).toHaveText('Expliquer');
  // The first move is from the book: "<move> est un coup théorique".
  await expect(panel.locator('.lr-ext-bubble__title')).toContainText(' est ');
});
