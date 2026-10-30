import { html, type SafeHtml } from '#shared/html.ts';
import { piecesOf, squareStyle } from './board.ts';
import { sectionsMarkup } from './menu.ts';
import { positions } from './review.ts';

// The page's little Lichess (index.html's .mock): an analysis board in the
// layout picked, the extension's four places for the site's menu (its
// settings' Navigation), drawn in the theme, the board and the pieces picked
// above (looks.css). Its menu is menu.ts's, to hover and fold.

export const LAYOUTS = [
  { id: 'rail', name: 'Rail' },
  { id: 'sidebar', name: 'Sidebar' },
  { id: 'unfolded', name: 'Unfolded' },
  { id: 'header', name: 'Header' },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]['id'];

export const isLayout = (id: string | undefined): id is LayoutId =>
  LAYOUTS.some(layout => layout.id === id);

// The analysis board's buttons, as the review's (index.html's .demo-controls).
const CONTROLS = [
  'i-arrow-left-double',
  'i-arrow-left-01',
  'i-play',
  'i-arrow-right-01',
  'i-arrow-right-double',
];

// The Opera Game after Black's tenth move: the position its turn hangs on.
const SHOWN_PLY = 20;

function navMarkup(): SafeHtml {
  return html`<nav class="mock-nav menu" aria-label="Lichess’s menu">
    <span class="mock-logo"><span class="mock-horse"></span><span>Lichess</span></span>
    <button type="button" class="menu-toggle" aria-label="Collapse the sidebar" aria-expanded="true"><span class="icon i-sidebar-left"></span></button>
    <span class="mock-sections">${sectionsMarkup({ section: 'Tools', page: 'Analysis board' })}</span>
    <span class="mock-tools" aria-hidden="true"><span class="mock-search"><span class="icon i-search-01"></span><span>Search</span></span><span class="icon i-settings-01"></span><span class="icon i-moon-02"></span></span>
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
    <div class="mock-main" aria-hidden="true">
      ${boardMarkup()}
      <div class="mock-panel">
        <div class="mock-card"><img class="mock-coach" src="img/coaches/mascot-${coach}.webp" alt="" width="124" height="76" /><p><b>Play a move.</b><span>I’ll tell you if it’s the best, an inaccuracy or a blunder.</span></p></div>
        ${movesMarkup()}
        <div class="mock-controls">${CONTROLS.map(icon => html`<i><span class="icon ${icon}"></span></i>`)}</div>
      </div>
    </div>
  </div>`;
}

export const layoutButtons = (picked: LayoutId): SafeHtml =>
  html`${LAYOUTS.map(
    layout =>
      html`<button type="button" data-layout="${layout.id}" aria-pressed="${String(layout.id === picked)}"><span class="layout-icon layout-icon--${layout.id}" aria-hidden="true"><i></i><i></i><i></i></span><span>${layout.name}</span></button>`,
  )}`;
