import { html, type SafeHtml } from '#shared/html.ts';

// Lichess's menu as the extension draws it (styles/sidebar): its sections, each
// with its pages under it, in the sidebar's own pictures. The little Lichess
// (layout.ts) shows it in the layout picked, the hero's window as the rail;
// menu-folds.ts wires the toggle and the unfolded sidebar's folds.

interface Page {
  readonly name: string;
  readonly picture: string;
}

interface Section extends Page {
  readonly pages: readonly Page[];
}

const SECTIONS: readonly Section[] = [
  {
    name: 'Play',
    picture: 'play',
    pages: [
      { name: 'Lobby', picture: 'friendly-challenge' },
      { name: 'Arena tournaments', picture: 'arena-tournaments' },
      { name: 'Swiss tournaments', picture: 'swiss-tournaments' },
      { name: 'Simultaneous exhibitions', picture: 'simultaneous-exhibitions' },
    ],
  },
  {
    name: 'Puzzles',
    picture: 'puzzles',
    pages: [
      { name: 'Puzzles', picture: 'puzzles' },
      { name: 'Puzzle Themes', picture: 'puzzle-themes' },
      { name: 'Puzzle Dashboard', picture: 'puzzle-dashboard' },
      { name: 'Puzzle Streak', picture: 'puzzle-streak' },
      { name: 'Puzzle Storm', picture: 'puzzle-storm' },
      { name: 'Puzzle Racer', picture: 'puzzle-racer' },
    ],
  },
  {
    name: 'Learn',
    picture: 'learn',
    pages: [
      { name: 'Chess basics', picture: 'chess-basics' },
      { name: 'Practice', picture: 'practice' },
      { name: 'Opening training', picture: 'openings' },
      { name: 'Coordinates', picture: 'coordinate-practice' },
      { name: 'Study', picture: 'study' },
      { name: 'Coaches', picture: 'coach' },
    ],
  },
  {
    name: 'Watch',
    picture: 'watch-binoculars',
    pages: [
      { name: 'Broadcasts', picture: 'broadcasts' },
      { name: 'Lichess TV', picture: 'lichess-tv' },
      { name: 'Current games', picture: 'current-games' },
      { name: 'Streamers', picture: 'streamers' },
      { name: 'Videos', picture: 'video-library' },
    ],
  },
  {
    name: 'Community',
    picture: 'community',
    pages: [
      { name: 'Players', picture: 'community' },
      { name: 'Teams', picture: 'teams' },
      { name: 'Forum', picture: 'forum' },
      { name: 'Blog', picture: 'blog' },
    ],
  },
  {
    name: 'Tools',
    picture: 'tools',
    pages: [
      { name: 'Analysis board', picture: 'analysis-board' },
      { name: 'Openings', picture: 'openings' },
      { name: 'Board editor', picture: 'board-editor' },
      { name: 'Import game', picture: 'import-game' },
      { name: 'Advanced search', picture: 'advanced-search' },
    ],
  },
  // No pages: folded, its name shows beside it instead.
  { name: 'Donate', picture: 'donation', pages: [] },
];

const picture = (name: string): SafeHtml =>
  html`<img src="img/sidebar/${name}.webp" alt="" width="96" height="96" loading="lazy" />`;

/** Where a menu stands: the section and its page on show. */
interface Current {
  readonly section: string;
  readonly page: string;
}

function sectionMarkup(section: Section, current: Current): SafeHtml {
  const on = section.name === current.section;
  const pages = section.pages.map(
    page =>
      html`<span class="menu-page${on && page.name === current.page ? ' menu-page--on' : ''}">${picture(page.picture)}<span>${page.name}</span></span>`,
  );
  return html`<span class="menu-section${on ? ' menu-section--on' : ''}"
    ><button type="button" class="menu-link">${picture(section.picture)}<span>${section.name}</span><i class="menu-chevron icon i-arrow-down-01"></i></button
    ><span class="menu-pages" data-label="${section.name}">${pages}</span></span
  >`;
}

/** The sections, `current`'s open: the little Lichess shows the analysis board. */
export const sectionsMarkup = (current: Current): SafeHtml =>
  html`${SECTIONS.map(section => sectionMarkup(section, current))}`;

/** The hero's window's menu: the rail, each picture over its label, Play's on a game. */
export const railMarkup = (): SafeHtml =>
  html`<span class="demo-rail__logo mock-horse"></span>${sectionsMarkup({ section: 'Play', page: '' })}`;
