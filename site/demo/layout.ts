import { html, type SafeHtml } from '#shared/html.ts';
import { piecesOf, squareStyle } from './board.ts';
import { positions } from './review.ts';

// The page's little Lichess (index.html's .mock): an analysis board in the
// layout picked, the extension's four places for the site's menu (its
// settings' Navigation), drawn in the theme, the board and the pieces picked
// above (looks.css). The menu holds the sidebar's own pictures.

export const LAYOUTS = [
  { id: 'sidebar', name: 'Sidebar' },
  { id: 'unfolded', name: 'Unfolded' },
  { id: 'rail', name: 'Rail' },
  { id: 'header', name: 'Header' },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]['id'];

export const isLayout = (id: string | undefined): id is LayoutId =>
  LAYOUTS.some(layout => layout.id === id);

const SECTIONS = [
  { name: 'Play', picture: 'play' },
  { name: 'Puzzles', picture: 'puzzles' },
  { name: 'Learn', picture: 'learn' },
  { name: 'Watch', picture: 'watch-binoculars' },
  { name: 'Community', picture: 'community' },
  { name: 'Tools', picture: 'tools' },
  { name: 'Donate', picture: 'donation' },
];

// The open section's pages, the unfolded sidebar's: the analysis board is on show.
const TOOLS = [
  { name: 'Analysis board', picture: 'analysis-board' },
  { name: 'Openings', picture: 'openings' },
  { name: 'Board editor', picture: 'board-editor' },
  { name: 'Import game', picture: 'import-game' },
  { name: 'Advanced search', picture: 'advanced-search' },
];

// The Opera Game after Black's tenth move: the position its turn hangs on.
const SHOWN_PLY = 20;

const picture = (name: string): SafeHtml =>
  html`<img src="img/sidebar/${name}.webp" alt="" width="96" height="96" loading="lazy" />`;

function navMarkup(): SafeHtml {
  const sections = SECTIONS.map(section => {
    const open = section.name === 'Tools';
    const pages = open
      ? html`<span class="mock-pages">${TOOLS.map(
          (page, i) =>
            html`<span class="mock-page${i === 0 ? ' mock-page--on' : ''}">${picture(page.picture)}<span>${page.name}</span></span>`,
        )}</span>`
      : '';
    return html`<span class="mock-section${open ? ' mock-section--on' : ''}"><span class="mock-link">${picture(section.picture)}<span>${section.name}</span><i class="mock-chevron icon i-arrow-down-01"></i></span>${pages}</span>`;
  });
  return html`<nav class="mock-nav">
    <span class="mock-logo"><span class="mock-horse"></span><span>Lichess</span></span>
    <span class="mock-sections">${sections}</span>
    <span class="mock-tools"><span class="mock-search"><span class="icon i-search-01"></span><span>Search</span></span><span class="icon i-settings-01"></span><span class="icon i-moon-02"></span></span>
  </nav>`;
}

function boardMarkup(): SafeHtml {
  const position = positions[SHOWN_PLY];
  if (!position) return html``;
  const pieces = [...piecesOf(position.fen)].map(
    ([square, code]) =>
      html`<i class="mock-piece" style="${squareStyle(square)};background-image:var(--pc-${code})"></i>`,
  );
  return html`<div class="mock-board">${pieces}</div>`;
}

function movesMarkup(): SafeHtml {
  const rows: SafeHtml[] = [];
  for (let ply = 1; ply <= SHOWN_PLY; ply += 2)
    rows.push(
      html`<li><span>${(ply + 1) / 2}.</span><b>${positions[ply]?.san ?? ''}</b><b>${positions[ply + 1]?.san ?? ''}</b></li>`,
    );
  return html`<ol class="mock-moves">${rows}</ol>`;
}

export function mockMarkup(coach: number): SafeHtml {
  return html`<div class="mock-app">
    ${navMarkup()}
    <div class="mock-main">
      ${boardMarkup()}
      <div class="mock-panel">
        <div class="mock-card"><img class="mock-coach" src="img/coaches/mascot-${coach}.webp" alt="" width="62" height="57" /><p><b>Play a move.</b><span>I’ll tell you if it’s the best, an inaccuracy or a blunder.</span></p></div>
        ${movesMarkup()}
        <div class="mock-controls"><i></i><i></i><i></i><i></i></div>
      </div>
    </div>
  </div>`;
}

export const layoutButtons = (picked: LayoutId): SafeHtml =>
  html`${LAYOUTS.map(
    layout =>
      html`<button type="button" data-layout="${layout.id}" aria-pressed="${String(layout.id === picked)}"><span class="layout-icon layout-icon--${layout.id}" aria-hidden="true"><i></i><i></i><i></i></span><span>${layout.name}</span></button>`,
  )}`;
