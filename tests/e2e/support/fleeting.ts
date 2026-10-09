import type { Page } from '@playwright/test';
import { z } from 'zod/mini';

// The players' intro and the winner's confetti last a couple of seconds, which
// a loaded machine can spend before a test looks. The page notes what they
// showed while they were there, and the test reads its notes afterwards.

const IntroSchema = z.object({
  usernames: z.array(z.string()),
  widths: z.array(z.number()),
  /** The dropped board's image and the swords', and cg-board's overflow while it drops. */
  board: z.string(),
  swords: z.string(),
  overflow: z.string(),
});

export type IntroSnapshot = z.infer<typeof IntroSchema>;

/**
 * From its next page on, the tab takes notes as they come. A tab's own init
 * script: a persistent context's reaches none of the tab it opens with.
 */
export async function noteFleeting(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () =>
      new MutationObserver(() => {
        // Read here: the script runs before the page has an <html>.
        const root = document.documentElement;
        const intro = document.querySelector('main.round > .lr-ext-intro');
        if (intro && !('testIntro' in root.dataset)) {
          const board = document.querySelector('main.round .round__app__board cg-board');
          const swords = intro.querySelector('.lr-ext-intro__swords');
          const cards = [...intro.querySelectorAll('.lr-ext-intro__card')];
          root.dataset.testIntro = JSON.stringify({
            usernames: cards.map(
              card => card.querySelector('.lr-ext-intro__username')?.textContent ?? '',
            ),
            widths: cards.map(card => card.getBoundingClientRect().width),
            board: board ? getComputedStyle(board, '::after').backgroundImage : '',
            swords: swords ? getComputedStyle(swords).backgroundImage : '',
            overflow: board ? getComputedStyle(board).overflow : '',
          });
        }
        if (document.querySelector('.lr-ext-confetti__piece')) root.dataset.testConfetti = '';
      }).observe(document.body, { childList: true, subtree: true }),
    );
  });
}

export interface FleetingNotes {
  readonly intro: IntroSnapshot | null;
  readonly confetti: boolean;
}

export async function readFleeting(page: Page): Promise<FleetingNotes> {
  const { intro, confetti } = await page.evaluate(() => ({
    intro: document.documentElement.dataset.testIntro ?? null,
    confetti: 'testConfetti' in document.documentElement.dataset,
  }));
  const parsed = intro === null ? null : IntroSchema.safeParse(JSON.parse(intro));
  return { intro: parsed?.success ? parsed.data : null, confetti };
}
