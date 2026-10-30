import { html, type SafeHtml } from '#shared/html.ts';
import { BUILT_IN_THEMES } from '#content/colors/built-in.ts';
import { MATERIAL_BOARDS } from '#content/packs/materials.ts';
import { LICHESS_SET, pieceUrl } from './pieces.ts';

// The color themes, the boards and the piece sets the page lets a visitor try,
// the extension's own: a theme recolors the whole page, as it does Lichess, and
// a board or a set both the review's and the layout's (demo-window.css, mock.css).

const SHOWN_THEMES = new Set([
  'neo',
  'ocean',
  'grove',
  'ember',
  'iris',
  'blossom',
  'ruby',
  'aurora',
]);

// The material boards shown, each with its relief and a still of it for its
// button: the reliefs weigh up to 1.5 MB, so only a board picked loads its own.
// Written out whole for scripts/lib/site-assets.ts, which copies what's named.
const SHOWN_MATERIALS: Readonly<Record<string, { relief: string; still: string }>> = {
  burl: { relief: 'img/boards/burl.webp', still: 'shots/board-materials-burl.webp' },
  cocobolo: { relief: 'img/boards/cocobolo.webp', still: 'shots/board-materials-cocobolo.webp' },
  padauk: { relief: 'img/boards/padauk.webp', still: 'shots/board-materials-padauk.webp' },
  portoro: { relief: 'img/boards/portoro.webp', still: 'shots/board-materials-portoro.webp' },
  marble: { relief: 'img/boards/marble.webp', still: 'shots/board-materials-marble.webp' },
  zellige: { relief: 'img/boards/zellige.webp', still: 'shots/board-materials-zellige.webp' },
};

const capitalized = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

interface Palette {
  readonly hue: number;
  readonly chroma: number;
  readonly accent: string;
}

export interface SiteTheme {
  readonly id: string;
  readonly name: string;
  readonly dark: Palette;
  readonly light: Palette;
}

export const THEMES: readonly SiteTheme[] = BUILT_IN_THEMES.filter(theme =>
  SHOWN_THEMES.has(theme.id),
).map(({ id, dark, light }) => ({ id, name: capitalized(id), dark, light }));

export const isLight = (): boolean => document.documentElement.dataset.scheme === 'light';

export interface SiteBoard {
  readonly id: string;
  readonly name: string;
  readonly light: string;
  readonly dark: string;
  /** Its relief and its still, for a material board. */
  readonly relief: string | null;
  readonly still: string | null;
}

export const BOARDS: readonly SiteBoard[] = [
  // The extension's own, in the theme's accent.
  {
    id: 'accent',
    name: 'Theme',
    light: '#f7f8f8',
    dark: 'var(--accent)',
    relief: null,
    still: null,
  },
  ...MATERIAL_BOARDS.flatMap(board => {
    const shown = SHOWN_MATERIALS[board.texture ?? ''];
    return shown
      ? [
          {
            id: board.texture ?? board.id,
            name: board.name,
            light: board.light,
            dark: board.dark,
            ...shown,
          },
        ]
      : [];
  }),
];

const fileUrl = (file: string): string => `url("${new URL(file, document.baseURI).href}")`;

/** The theme's palette for the scheme on show, as the extension has one for each. */
export function showTheme(theme: SiteTheme): void {
  const palette = isLight() ? theme.light : theme.dark;
  const root = document.documentElement.style;
  root.setProperty('--hue', String(palette.hue));
  root.setProperty('--chroma', String(palette.chroma));
  root.setProperty('--accent', palette.accent);
}

/** A board's colors and texture, as the variables the boards are drawn from. */
const boardStyle = (board: SiteBoard): readonly [string, string][] => [
  ['--board-light', board.light],
  ['--board-dark', board.dark],
  ['--board-texture', board.relief === null ? 'none' : fileUrl(board.relief)],
];

export function showBoard(board: SiteBoard): void {
  for (const [name, value] of boardStyle(board))
    document.documentElement.style.setProperty(name, value);
}

export const themeButtons = (picked: string): SafeHtml =>
  html`${THEMES.map(
    theme =>
      html`<button type="button" data-theme="${theme.id}" aria-pressed="${String(theme.id === picked)}" aria-label="${theme.name}" title="${theme.name}" style="--swatch:${theme.dark.accent}"><i></i></button>`,
  )}`;

// A material's button shows its still; the accent's is drawn, in the theme.
export const boardButtons = (picked: string): SafeHtml =>
  html`${BOARDS.map(
    board =>
      html`<button type="button" data-board="${board.id}" aria-pressed="${String(board.id === picked)}" aria-label="${board.name}" title="${board.name}">${board.still ? html`<img src="${board.still}" alt="" width="174" height="174" />` : html`<i class="board-thumb"></i>`}</button>`,
  )}`;

// Lichess's set, then some of the extension's.
const PIECE_SETS: readonly { id: string; name: string }[] = [
  { id: LICHESS_SET, name: 'Lichess' },
  { id: 'mochi', name: 'Mochi' },
  { id: 'mellow', name: 'Mellow' },
  { id: 'loop', name: 'Loop' },
  { id: 'poppy', name: 'Poppy' },
  { id: 'fold', name: 'Fold' },
  { id: 'bitty', name: 'Bitty' },
];

export const pieceButtons = (picked: string): SafeHtml =>
  html`${PIECE_SETS.map(
    set =>
      html`<button type="button" data-pieces="${set.id}" aria-pressed="${String(set.id === picked)}" aria-label="${set.name}" title="${set.name}"><img src="${pieceUrl(set.id, 'wN')}" alt="" width="40" height="40" /></button>`,
  )}`;
