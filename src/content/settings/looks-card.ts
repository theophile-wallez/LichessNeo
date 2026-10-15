import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { closestTo, createElement, queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { hasPart, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { isBacklitBoard } from '#shared/backlit.ts';
import { postLichessLook } from '#shared/protocol.ts';
import { message } from '#content/platform/runtime.ts';
import type { SquareColors } from '#content/packs/custom-board.ts';
import { paintTiles } from '#content/packs/backlit-keys.ts';
import { showSquares } from '#content/packs/flat-boards.ts';
import { LICHESS, type Library } from '#content/packs/library.ts';
import { OPTION_ROWS } from '#content/packs/options.ts';
import { showOptionRows } from '#content/packs/option-row.ts';
import { deleteBoard, savedBoards } from '#content/packs/saved-boards.ts';
import { ACCENT_BOARD, familyOf, themesOf } from '#content/packs/themes.ts';
import { settingsHash } from './address.ts';
import { lichessCurrent, type LichessLook } from './lichess-looks.ts';
import { familySections, hasFamilies, subLabel } from './looks-families.ts';

// A card of the settings' Board & sounds page (styles/pages/settings-looks.css):
// the extension's looks for one part, its themes and the packs that have it,
// with their settings (the families', as the backlit boards, in sections of
// their own), over Lichess's own. The part shows one of them; Lichess's
// is ringed only while the extension leaves the part to it, as in the user menu.

const TEXTS: Readonly<Record<PartKind, readonly [title: string, body: string]>> = {
  board: ['looksBoard', 'looksBoardBody'],
  piece: ['looksPieces', 'looksPiecesBody'],
  sound: ['looksSounds', 'looksSoundsBody'],
};

interface Tile {
  readonly id: string;
  readonly name: string;
  /** A picture's URL; null for a theme of ours, which the CSS draws from its id. */
  readonly image: string | null;
  /** The image is a whole board, of which the tile shows the top-left squares (a pack's). */
  readonly whole?: boolean;
  /** A two-tone board's squares, drawn on its tile. */
  readonly colors?: SquareColors;
}

function packImage(kind: PartKind, pack: Pack): string | null {
  if (kind === 'board') return pack.board?.image ?? null;
  return kind === 'piece' ? (pack.pieces?.wN ?? null) : null;
}

function thumbnail(kind: PartKind, { id, image, whole, colors }: Tile): HTMLElement {
  if (kind === 'piece' && image !== null)
    return createElement('img', {
      className: 'lr-ext-src-thumb',
      attrs: { src: image, alt: '', loading: 'lazy' },
    });
  const thumb = createElement('span', { className: 'lr-ext-src-thumb' });
  if (image === null) setData(thumb, 'lrExtTheme', id);
  else if (whole) {
    setStyleProperty(thumb, 'background-image', `url("${image}")`);
    setData(thumb, 'lrExtWhole', '');
  } else {
    // Lichess's thumbnail is two squares: the stylesheet draws it again, flipped, under them.
    setStyleProperty(thumb, '--lr-ext-thumb-image', `url("${image}")`);
    setData(thumb, 'lrExtPair', '');
  }
  if (colors) showSquares(thumb, colors);
  // A backlit board's four keys, each lit as the pointer comes over it.
  if (isBacklitBoard(id) && image === null)
    thumb.append(
      ...Array.from({ length: 4 }, () => createElement('span', { className: 'lr-ext-src-key' })),
    );
  return thumb;
}

function tileButton(kind: PartKind, tile: Tile, data: string): HTMLButtonElement {
  const button = createElement('button', {
    className: 'lr-ext-src-item',
    attrs: { type: 'button', [data]: tile.id, title: tile.name },
  });
  // Sounds have no picture: a pill with the name.
  if (kind !== 'sound') button.append(thumbnail(kind, tile));
  button.append(createElement('span', { className: 'lr-ext-src-name', text: tile.name }));
  return button;
}

// A few of Lichess's piece sets are in WebP only: its manifest, which says which, is the page's.
function onPieceError(event: Event): void {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.src.endsWith('.svg'))
    image.src = image.src.replace(/\.svg$/, '.webp');
}

// A saved board's tile, with a button to delete it.
function savedTile(kind: PartKind, tile: Tile): HTMLElement {
  const wrap = createElement('div', { className: 'lr-ext-src-saved' });
  const label = message('looksDeleteBoard', tile.name);
  const remove = createElement('button', {
    className: 'lr-ext-src-delete',
    attrs: { type: 'button', 'data-lr-ext-delete': tile.id, 'aria-label': label, title: label },
  });
  setHtml(remove, hugeicon(Cancel01Icon));
  wrap.append(tileButton(kind, tile, 'data-lr-ext-choice'), remove);
  return wrap;
}

// The classic ones: a family's are in its own section (looks-families.ts).
function themeTiles(kind: PartKind): HTMLElement[] {
  return themesOf(kind)
    .filter(theme => theme.family === undefined)
    .map(({ id, name, colors, saved }) => {
      const tile: Tile = { id, name, image: null, ...(colors && { colors }) };
      return saved ? savedTile(kind, tile) : tileButton(kind, tile, 'data-lr-ext-choice');
    });
}

function oursMarkup(kind: PartKind, library: Library): HTMLElement[] {
  const themes = themeTiles(kind);
  const packs = library
    .packs()
    .filter(pack => hasPart(pack, kind))
    .map(pack =>
      tileButton(
        kind,
        { id: pack.id, name: pack.name, image: packImage(kind, pack), whole: kind === 'board' },
        'data-lr-ext-choice',
      ),
    );
  if (themes.length + packs.length > 0) return [...themes, ...packs];
  const note = createElement('p', { className: 'lr-ext-looks__empty' });
  note.append(
    message('looksNoPieces'),
    ' ',
    createElement('a', {
      text: message('settingsPagePacks'),
      attrs: { href: settingsHash('packs') },
    }),
    '.',
  );
  return [note];
}

export interface LooksCard {
  readonly element: HTMLElement;
  /** Lists Lichess's own, or says they couldn't be read (null). */
  readonly showLichess: (looks: readonly LichessLook[] | null) => void;
  /** Rings what the part shows. */
  readonly mark: () => void;
}

function markCard(card: HTMLElement, kind: PartKind, library: Library): void {
  const current = library.current(kind);
  const lichess = current === LICHESS ? lichessCurrent(kind) : undefined;
  for (const item of queryAll(card, '.lr-ext-src-item', HTMLElement)) {
    const { lrExtChoice, lrExtLichess } = item.dataset;
    const on = lrExtChoice === current || (lrExtLichess !== undefined && lrExtLichess === lichess);
    item.classList.toggle('active', on);
  }
  showOptionRows(card, current);
  const family = familyOf(kind, current);
  for (const rows of queryAll(card, '.lr-ext-looks__family', HTMLElement))
    rows.hidden = rows.dataset.lrExtFamily !== family;
}

function cardHead(kind: PartKind): HTMLElement {
  const [title, body] = TEXTS[kind];
  const head = createElement('div', { className: 'lr-ext-looks__head' });
  const heading = createElement('div');
  heading.append(
    createElement('h2', { className: 'lr-ext-setting__title', text: message(title) }),
    createElement('p', { className: 'lr-ext-setting__body', text: message(body) }),
  );
  head.append(
    createElement('span', { className: 'lr-ext-setting__icon', attrs: { 'aria-hidden': 'true' } }),
    heading,
  );
  return head;
}

function pickLichess(kind: PartKind, library: Library, item: HTMLElement, id: string): void {
  if (library.current(kind) !== LICHESS) library.choose(kind, LICHESS);
  postLichessLook({ part: kind, id });
  // The page world names it on <body> in a moment: ring it now.
  for (const other of queryAll(item.parentElement ?? item, '.lr-ext-src-item', HTMLElement))
    other.classList.toggle('active', other === item);
}

// A saved board deleted while it shows leaves the board to the accent's.
function deleteSaved(kind: PartKind, library: Library, id: string): void {
  const shown = library.current(kind);
  deleteBoard(id);
  library.choose(kind, shown === id ? ACCENT_BOARD : shown);
}

function onCardClick(kind: PartKind, library: Library, event: Event): void {
  const removed = closestTo(event.target, '[data-lr-ext-delete]', HTMLElement)?.dataset.lrExtDelete;
  if (removed !== undefined) {
    deleteSaved(kind, library, removed);
    return;
  }
  const item = closestTo(event.target, '.lr-ext-src-item', HTMLElement);
  const { lrExtChoice, lrExtLichess } = item?.dataset ?? {};
  if (lrExtChoice !== undefined) library.choose(kind, lrExtChoice);
  if (item && lrExtLichess !== undefined) pickLichess(kind, library, item, lrExtLichess);
}

const label = (text: string): HTMLElement =>
  createElement('h3', { className: 'lr-ext-appearance__label', text });

/** The card for `kind`, its list of ours drawn again as packs and saved boards come and go. */
export function buildLooksCard(kind: PartKind, library: Library): LooksCard {
  const card = createElement('section', { className: 'lr-ext-looks' });
  setData(card, 'lrExtPart', kind);
  const ours = createElement('div', { className: 'lr-ext-looks__grid' });
  const lichess = createElement('div', { className: 'lr-ext-looks__grid' });
  card.append(
    cardHead(kind),
    label(message('looksOurs')),
    ...(hasFamilies(kind) ? [subLabel(message('looksClassic'))] : []),
    ours,
    ...OPTION_ROWS[kind].map(row => row(library)),
    ...familySections(kind, ({ id, name }) =>
      tileButton(kind, { id, name, image: null }, 'data-lr-ext-choice'),
    ),
    label(message('looksLichess')),
    lichess,
  );
  let listedPacks: readonly Pack[] | null = null;
  let listedBoards: unknown = null;
  const mark = (): void => {
    if (library.packs() !== listedPacks || savedBoards() !== listedBoards) {
      listedPacks = library.packs();
      listedBoards = savedBoards();
      ours.replaceChildren(...oursMarkup(kind, library));
    }
    markCard(card, kind, library);
    paintTiles(card);
  };
  card.addEventListener('error', onPieceError, true);
  card.addEventListener('click', event => onCardClick(kind, library, event));
  mark();
  return {
    element: card,
    showLichess: looks => {
      const items = looks?.map(look => tileButton(kind, look, 'data-lr-ext-lichess'));
      lichess.replaceChildren(
        ...(items ?? [
          createElement('p', {
            className: 'lr-ext-looks__empty',
            text: message('looksLichessFailed'),
          }),
        ]),
      );
      markCard(card, kind, library);
    },
    mark,
  };
}
