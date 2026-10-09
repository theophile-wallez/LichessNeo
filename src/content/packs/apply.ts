import { createElement, setData } from '#shared/dom.ts';
import type { SoundFiles } from '#shared/protocol.ts';
import { SOUND_NAMES } from '#shared/sounds.ts';
import { PIECE_NAMES, pieceVariable, type Pack } from '#shared/packs/pack.ts';
import { dataUrlBytes } from '#shared/packs/sniff.ts';
import type { Look } from './library.ts';

// Puts the picked looks on the page. A pack's images go in a stylesheet of
// ours, as data: URLs too long for <html>'s style attribute, which other
// features rewrite. Pieces override the variables Lichess draws its own from;
// the board is named in `data-lr-ext-board` for styles/board/pieces.css: a theme
// of ours, a pack's, or none for Lichess's.

const STYLE_ID = 'lr-ext-packs';

export interface Shown {
  readonly board: Look;
  readonly pieces: Look;
}

// A theme is drawn by our CSS alone.
const packOf = (look: Look): Pack | null => (typeof look === 'string' ? null : look);

function boardName(look: Look): string | null {
  if (typeof look === 'string') return look;
  return look?.board ? 'pack' : null;
}

// Unquoted, as Lichess writes its own: it reads them back to decode each image
// before drawing the board (ui/site/src/asset.ts, `loadPieces`), slicing off
// `url(` and `)`. PackSchema keeps the data: URLs to characters that need no
// quotes. On <body> too, where Lichess sets its own inline once its menu
// changes the board or the set: a value there beats one inherited.
function pieceRule(pack: Pack | null): string | null {
  const images = pack?.pieces;
  if (images === undefined) return null;
  const declarations = PIECE_NAMES.map(
    name => `${pieceVariable(name)}:url(${images[name]}) !important`,
  );
  return `:root,body{${declarations.join(';')}}`;
}

function boardRules(pack: Pack | null): string[] {
  const board = pack?.board;
  if (board === undefined) return [];
  const { image, light, dark } = board;
  const squares = light && dark ? `;--lr-ext-sq-light:${light};--lr-ext-sq-dark:${dark}` : '';
  const rules = [`:root{--lr-ext-board-img:url("${image}")${squares}}`];
  // Without the squares' colors, the coordinates keep Lichess's board's.
  if (squares)
    rules.push(
      `html body .is2d coords{---cg-ccw:${light} !important;---cg-ccb:${dark} !important}`,
    );
  return rules;
}

/** The stylesheet that shows these packs ('' for Lichess's own). */
export function packRules({ board, pieces }: Shown): string {
  return [pieceRule(packOf(pieces)), ...boardRules(packOf(board))]
    .filter(rule => rule !== null)
    .join('\n');
}

function packStyle(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = createElement('style', { id: STYLE_ID });
  // From document_start, before there is a <head>.
  (document.head ?? document.documentElement).append(style);
  return style;
}

export function showLooks(shown: Shown): void {
  setData(document.documentElement, 'lrExtBoard', boardName(shown.board));
  const text = packRules(shown);
  const style = document.getElementById(STYLE_ID) ?? (text === '' ? null : packStyle());
  if (style && style.textContent !== text) style.textContent = text;
}

/** The pack's sounds as bytes, for the page world to play (none: Lichess's own). */
export function soundFiles(look: Look): SoundFiles {
  const files: SoundFiles = {};
  for (const name of SOUND_NAMES) {
    const url = packOf(look)?.sounds?.[name];
    if (url !== undefined) files[name] = dataUrlBytes(url);
  }
  return files;
}

/** What the page hides until the stored packs are read, so it never shows Lichess's first. */
export function setLoading(parts: readonly string[]): void {
  setData(document.documentElement, 'lrExtLoading', parts.length > 0 ? parts.join(' ') : null);
}
