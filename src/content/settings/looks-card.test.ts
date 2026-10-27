import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { Pack, PartKind } from '#shared/packs/pack.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { createLibrary, LICHESS, type Library, type Shown } from '#content/packs/library.ts';
import { saveBoard, savedBoards } from '#content/packs/saved-boards.ts';
import { PIECE_SETS } from '#content/packs/piece-sets.ts';
import { buildLooksCard, type LooksCard } from './looks-card.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);

const LICHESS_BOARDS = [
  { id: 'brown', name: 'Brown', image: 'https://lichess1.org/assets/brown.svg', whole: true },
  { id: 'wood4', name: 'Wood4', image: 'https://lichess1.org/assets/wood4.thumbnail.jpg' },
];

async function card(
  kind: PartKind,
  packs: readonly Pack[] = [],
): Promise<{ readonly library: Library; readonly looks: LooksCard; readonly shown: Shown[] }> {
  const shown: Shown[] = [];
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve(packs),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: next => shown.push(next),
  });
  await library.loadAll();
  const looks = buildLooksCard(kind, library);
  // As the Board & sounds page does.
  library.onChange(looks.mark);
  document.body.append(looks.element);
  return { library, looks, shown };
}

const ringed = (root: HTMLElement): (string | undefined)[] =>
  queryAll(root, '.ln-ext-src-item.active', HTMLElement).map(
    item => item.dataset.lnExtChoice ?? item.dataset.lnExtLichess,
  );

const choices = (grid: HTMLElement | undefined): (string | undefined)[] =>
  grid ? queryAll(grid, '.ln-ext-src-item', HTMLElement).map(item => item.dataset.lnExtChoice) : [];

function click(root: HTMLElement, selector: string): void {
  const item = queryOne(root, selector, HTMLElement);
  if (!item) throw new Error(`no ${selector}`);
  item.click();
}

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: {
      getMessage: (name: string, substitutions: readonly string[] = []) =>
        [name, ...substitutions].join(':'),
    },
  });
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete document.body.dataset.board;
  localStorage.clear();
});

describe('a Board & sounds card', () => {
  it('rings the part’s pick, and the new one once picked', async () => {
    const { library, looks } = await card('board');
    expect(ringed(looks.element)).toEqual(['accent']);
    click(looks.element, "[data-ln-ext-choice='custom']");
    expect(library.current('board')).toBe('custom');
    expect(localStorage.getItem('ln-ext-board')).toBe('custom');
    expect(ringed(looks.element)).toEqual(['custom']);
  });

  it('shows a family’s settings only while one of its boards is picked', async () => {
    const { looks } = await card('board');
    const family = (): HTMLElement['hidden'] | undefined =>
      queryOne(looks.element, "[data-ln-ext-family='backlit']", HTMLElement)?.hidden;
    expect(family()).toBe(true);
    click(looks.element, "[data-ln-ext-choice='backlit-forest']");
    expect(family()).toBe(false);
    click(looks.element, "[data-ln-ext-choice='accent']");
    expect(family()).toBe(true);
  });

  it('draws a material board’s tile in its colors, under its texture', async () => {
    const { looks } = await card('board');
    const thumb = queryOne(
      looks.element,
      "[data-ln-ext-choice='materials-slate'] .ln-ext-src-thumb",
      HTMLElement,
    );
    expect(thumb?.dataset.lnExtSquares).toBe('');
    expect(thumb?.style.getPropertyValue('--ln-ext-thumb-light')).toBe('#d0ccc1');
    expect(thumb?.style.getPropertyValue('--ln-ext-thumb-texture')).toBe(
      'var(--ln-ext-texture-slate)',
    );
  });

  it('lists the packs that have the part under their own heading, apart from ours', async () => {
    const pieces = await card('piece', [WOOD, CLICKS]);
    // The extension's sets, the packs', then Lichess's.
    const [ours, packs] = queryAll(pieces.looks.element, '.ln-ext-looks__grid', HTMLElement);
    expect(choices(ours)).toEqual(PIECE_SETS.map(set => set.id));
    expect(choices(packs)).toEqual([WOOD.id]);
    expect(packs?.hidden).toBe(false);
    expect(packs?.previousElementSibling?.textContent).toBe('looksPacks');
    expect(
      queryAll(pieces.looks.element, 'img.ln-ext-src-thumb', HTMLImageElement).map(image =>
        image.getAttribute('src'),
      ),
    ).toEqual([WOOD.pieces?.wN]);
  });

  it('leaves the packs’ heading out while no pack has the part', async () => {
    const pieces = await card('piece', [CLICKS]);
    const [, packs] = queryAll(pieces.looks.element, '.ln-ext-looks__grid', HTMLElement);
    expect(packs?.childElementCount).toBe(0);
    expect(packs?.hidden).toBe(true);
    expect(packs?.previousElementSibling).toHaveProperty('hidden', true);
  });

  it('ends the pieces’ card with their black’s color, which holds for Lichess’s sets too', async () => {
    const { looks } = await card('piece');
    looks.showLichess([]);
    expect(looks.element.lastElementChild?.textContent).toContain('Black pieces');
    document.body.innerHTML = '';
    const board = await card('board');
    expect(board.looks.element.textContent).not.toContain('Black pieces');
  });

  it('picks one of Lichess’s own, and tells the page world', async () => {
    document.body.dataset.board = 'wood4';
    const { library, looks } = await card('board');
    looks.showLichess(LICHESS_BOARDS);
    // Not ringed while the extension shows its own board.
    expect(ringed(looks.element)).toEqual(['accent']);
    click(looks.element, "[data-ln-ext-lichess='brown']");
    expect(library.current('board')).toBe(LICHESS);
    expect(window.postMessage).toHaveBeenLastCalledWith(
      { type: 'ln-ext:lichess-look', part: 'board', id: 'brown' },
      location.origin,
    );
    expect(ringed(looks.element)).toEqual(['brown']);
  });

  it('rings what Lichess shows while the part is left to it', async () => {
    document.body.dataset.board = 'wood4';
    const { library, looks } = await card('board');
    library.choose('board', LICHESS);
    looks.showLichess(LICHESS_BOARDS);
    expect(ringed(looks.element)).toEqual(['wood4']);
  });

  it('says so when Lichess’s own can’t be read', async () => {
    const { looks } = await card('sound');
    looks.showLichess(null);
    expect(looks.element.textContent).toContain('looksLichessFailed');
  });

  it('deletes a saved board, leaving the accent’s if it was shown', async () => {
    const id = saveBoard('Mine', { light: '#eeeeee', dark: '#333333' });
    const { library, looks } = await card('board');
    click(looks.element, `[data-ln-ext-choice='${id}']`);
    click(looks.element, `[data-ln-ext-delete='${id}']`);
    expect(savedBoards()).toEqual([]);
    expect(library.current('board')).toBe('accent');
    expect(queryOne(looks.element, `[data-ln-ext-choice='${id}']`, HTMLElement)).toBeNull();
  });

  it('falls back to a piece set’s WebP where it has no SVG', async () => {
    const { looks } = await card('piece');
    looks.showLichess([{ id: 'pixel', name: 'Pixel', image: 'https://lichess1.org/pixel/wN.svg' }]);
    const image = queryOne(looks.element, 'img', HTMLImageElement);
    image?.dispatchEvent(new Event('error'));
    expect(image?.getAttribute('src')).toBe('https://lichess1.org/pixel/wN.webp');
  });
});

function point(target: Element | null, type: string, pointerType = 'mouse'): void {
  target?.dispatchEvent(new PointerEvent(type, { bubbles: type === 'pointerover', pointerType }));
}

const shownBoard = (shown: readonly Shown[]): unknown => shown.at(-1)?.board;

describe('a Board & sounds card hovered', () => {
  it('shows the tile under the pointer, unsaved, across its grid’s gaps', async () => {
    const { library, looks, shown } = await card('board');
    const tile = queryOne(looks.element, "[data-ln-ext-choice='tone-ocean']", HTMLElement);
    point(tile, 'pointerover');
    expect(shownBoard(shown)).toBe('tone-ocean');
    point(tile?.closest('.ln-ext-looks__grid') ?? null, 'pointerover');
    expect(shownBoard(shown)).toBe('tone-ocean');
    expect(library.current('board')).toBe('accent');
    expect(localStorage.getItem('ln-ext-board')).toBeNull();
  });

  it('shows the pick again once the pointer leaves the grid or the card', async () => {
    const { looks, shown } = await card('board');
    const tile = queryOne(looks.element, "[data-ln-ext-choice='tone-ocean']", HTMLElement);
    point(tile, 'pointerover');
    point(queryOne(looks.element, '.ln-ext-looks__head', HTMLElement), 'pointerover');
    expect(shownBoard(shown)).toBe('accent');
    point(tile, 'pointerover');
    point(looks.element, 'pointerleave');
    expect(shownBoard(shown)).toBe('accent');
  });

  it('keeps the tile clicked once the pointer leaves', async () => {
    const { looks, shown } = await card('board');
    const tile = queryOne(looks.element, "[data-ln-ext-choice='tone-ocean']", HTMLElement);
    point(tile, 'pointerover');
    tile?.click();
    point(looks.element, 'pointerleave');
    expect(shownBoard(shown)).toBe('tone-ocean');
  });

  it('leaves the board to the page world for one of Lichess’s, until the pointer leaves', async () => {
    const { looks, shown } = await card('board');
    looks.showLichess(LICHESS_BOARDS);
    point(queryOne(looks.element, "[data-ln-ext-lichess='brown']", HTMLElement), 'pointerover');
    expect(shownBoard(shown)).toBeNull();
    expect(window.postMessage).toHaveBeenLastCalledWith(
      { type: 'ln-ext:lichess-look-preview', part: 'board', id: 'brown' },
      location.origin,
    );
    point(looks.element, 'pointerleave');
    expect(shownBoard(shown)).toBe('accent');
    expect(window.postMessage).toHaveBeenLastCalledWith(
      { type: 'ln-ext:lichess-look-preview', part: 'board', id: null },
      location.origin,
    );
  });

  it('shows nothing for a touch, nor for a sound set, and names no tile in a tooltip', async () => {
    const boards = await card('board');
    const count = boards.shown.length;
    point(queryOne(boards.looks.element, '.ln-ext-src-item', HTMLElement), 'pointerover', 'touch');
    expect(boards.shown).toHaveLength(count);
    expect(queryAll(boards.looks.element, '.ln-ext-src-item[title]', HTMLElement)).toEqual([]);
    const sounds = await card('sound', [CLICKS]);
    const before = sounds.shown.length;
    point(queryOne(sounds.looks.element, '.ln-ext-src-item', HTMLElement), 'pointerover');
    expect(sounds.shown).toHaveLength(before);
  });
});
