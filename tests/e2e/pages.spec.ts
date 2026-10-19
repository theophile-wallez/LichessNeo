import { expect, test } from './fixtures.ts';
import { horizontalOverflow } from './support/layout.ts';
import { FINISHED_GAME, openLichess, rootVariable } from './support/lichess.ts';
import { expectSidebar } from './support/sidebar.ts';

// The main pages get the extension: the theme, the sidebar, both of its
// scripts, and no error from them. `ours` is something the extension adds on
// that page only. A smoke test, on lichess.org as it is today: what we add is
// tested in detail by the unit tests beside the code.

interface PublicPage {
  readonly name: string;
  readonly path: string;
  readonly ours: string;
}

const PAGES: readonly PublicPage[] = [
  { name: 'home', path: '/', ours: 'main.lobby > .ln-ext-hero + .ln-ext-speeds' },
  {
    name: 'a finished game’s analysis',
    path: FINISHED_GAME.path,
    ours: 'main.analyse > #ln-ext-review',
  },
  { name: 'the free analysis board', path: '/analysis', ours: '#ln-ext-review .ln-ext-coach' },
  { name: 'TV', path: '/tv', ours: 'main.round > .ln-ext-board-tools' },
  { name: 'a profile', path: '/@/DrNykterstein', ours: 'html[data-ln-ext-has~="user-show"]' },
  { name: 'puzzles', path: '/training', ours: 'html[data-ln-ext-has~="puzzle"]' },
  {
    name: 'a practice lesson',
    path: '/practice/checkmates/piece-checkmates-i/BJy6fEDf',
    ours: 'html[data-ln-ext-has~="practice"]',
  },
  { name: 'the forum', path: '/forum', ours: 'main.forum .categs tr[data-ln-ext-href]' },
];

// Lichess's panels and page, recolored by styles/theme in the default color
// theme: neutral steps 3 and 4 of each scheme's palette.
const PANEL_COLOR = 'oklch(17.3% 0.004 286)';
const LIGHT_PANEL_COLOR = 'oklch(98.5% 0.006 286)';
const LIGHT_PAGE_BACKGROUND = 'oklch(0.968 0.006 286)';

for (const { name, path, ours } of PAGES) {
  test(`${name} gets the extension`, async ({ page, extensionErrors }) => {
    await openLichess(page, path);
    expect(await rootVariable(page, '--ln-ext-bg-panel')).toBe(PANEL_COLOR);
    await expectSidebar(page);
    await expect(page.locator(ours).first()).toBeAttached();
    // The page script is in too: headless Chrome asks for reduced motion, which
    // page/motion answers as not asked.
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      false,
    );
    expect(await horizontalOverflow(page)).toBe(0);
    expect(extensionErrors).toEqual([]);
  });
}

// A visitor on a light OS gets Lichess's light theme, whose own rules still
// apply here and there: our light palette must hold over it.
test.describe('in Lichess’s light theme', () => {
  test.use({ colorScheme: 'light' });

  test('the home gets our light colors', async ({ page }) => {
    await openLichess(page, '/');
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(page.locator('html')).toHaveCSS('background-color', LIGHT_PAGE_BACKGROUND);
    expect(await rootVariable(page, '--ln-ext-bg-panel')).toBe(LIGHT_PANEL_COLOR);
    await expectSidebar(page);
  });
});
