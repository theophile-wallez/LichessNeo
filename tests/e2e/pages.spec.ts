import { expect, test } from './fixtures.ts';
import { horizontalOverflow } from './support/layout.ts';
import { FINISHED_GAME, openLichess, rootVariable } from './support/lichess.ts';
import { expectSidebar } from './support/sidebar.ts';

// Every public page gets the extension: the theme, the sidebar, both of its
// scripts, and no error from them. `ours`, when set, is something the
// extension adds on that page only.

interface PublicPage {
  readonly name: string;
  readonly path: string;
  readonly ours?: string;
}

const PAGES: readonly PublicPage[] = [
  { name: 'home', path: '/', ours: 'main.lobby > .lr-ext-hero' },
  {
    name: 'a finished game’s analysis',
    path: FINISHED_GAME.path,
    ours: 'main.analyse > #lr-ext-review',
  },
  { name: 'the free analysis board', path: '/analysis', ours: '#lr-ext-review .lr-ext-coach' },
  { name: 'TV', path: '/tv', ours: 'main.round > .lr-ext-board-tools' },
  { name: 'a profile', path: '/@/DrNykterstein', ours: 'html[data-lr-ext-has~="user-show"]' },
  // Its chart is only served to a signed-in visitor: see charts.spec.ts.
  {
    name: 'a rating’s stats',
    path: '/@/DrNykterstein/perf/blitz',
    ours: 'html[data-lr-ext-has~="perf-stat"]',
  },
  {
    name: 'the rating distribution',
    path: '/stat/rating/distribution/blitz',
    ours: '.lr-ext-dist',
  },
  { name: 'puzzles', path: '/training', ours: 'html[data-lr-ext-has~="puzzle"]' },
  {
    name: 'puzzle themes',
    path: '/training/themes',
    ours: 'html[data-lr-ext-has~="puzzle-themes"]',
  },
  { name: 'puzzles by opening', path: '/training/openings' },
  { name: 'practice', path: '/practice' },
  {
    name: 'a practice lesson',
    path: '/practice/checkmates/piece-checkmates-i/BJy6fEDf',
    ours: 'html[data-lr-ext-has~="practice"]',
  },
  { name: 'learn', path: '/learn' },
  { name: 'the forum', path: '/forum', ours: 'main.forum .categs tr[data-lr-ext-href]' },
  {
    name: 'a forum category',
    path: '/forum/general-chess-discussion',
    ours: 'main.forum-categ[data-lr-ext-href]',
  },
  { name: 'simuls', path: '/simul' },
  { name: 'Swiss tournaments', path: '/swiss' },
  {
    name: 'tournament winners',
    path: '/tournament/leaderboard',
    ours: '.tournament-leaderboards__item[data-lr-ext-icon]',
  },
  {
    name: 'tournament shields',
    path: '/tournament/shields',
    ours: '.tournament-shields__item[data-lr-ext-href]',
  },
  { name: 'players', path: '/player', ours: '.community .user-top[data-lr-ext-icon]' },
  { name: 'FIDE players', path: '/fide' },
  { name: 'FIDE federations', path: '/fide/federation' },
  { name: 'bots', path: '/player/bots', ours: '.subnav[data-lr-ext-nav~="bots"]' },
  { name: 'coaches', path: '/coach', ours: 'html[data-lr-ext-has~="coach-list"]' },
  { name: 'teams', path: '/team/all', ours: 'html[data-lr-ext-has~="team-list"]' },
  { name: 'studies', path: '/study' },
  { name: 'the blog', path: '/blog' },
  { name: 'broadcasts', path: '/broadcast', ours: '.subnav[data-lr-ext-nav~="broadcast"]' },
  { name: 'patron', path: '/patron' },
  { name: 'Puzzle Storm', path: '/storm', ours: 'html[data-lr-ext-has~="storm"]' },
  { name: 'Puzzle Racer', path: '/racer' },
  { name: 'about', path: '/about', ours: '.subnav[data-lr-ext-nav~="about"]' },
  { name: 'the board editor', path: '/editor' },
  { name: 'the coordinate trainer', path: '/training/coordinate' },
];

// Lichess's panels and page, recolored by styles/theme.
const PANEL_COLOR = '#262522';
const PAGE_BACKGROUND = 'rgb(48, 46, 43)';

for (const { name, path, ours } of PAGES) {
  test(`${name} gets the extension`, async ({ page, extensionErrors }) => {
    await openLichess(page, path);
    expect(await rootVariable(page, '--lr-ext-bg-panel')).toBe(PANEL_COLOR);
    await expectSidebar(page);
    if (ours !== undefined) await expect(page.locator(ours).first()).toBeAttached();
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
// apply here and there: our colors must hold over it.
test.describe('in Lichess’s light theme', () => {
  test.use({ colorScheme: 'light' });

  for (const path of ['/', FINISHED_GAME.path, '/tv', '/practice']) {
    test(`${path} keeps our colors`, async ({ page }) => {
      await openLichess(page, path);
      await expect(page.locator('html')).toHaveClass(/\blight\b/);
      await expect(page.locator('html')).toHaveCSS('background-color', PAGE_BACKGROUND);
      expect(await rootVariable(page, '--lr-ext-bg-panel')).toBe(PANEL_COLOR);
      await expectSidebar(page);
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});
