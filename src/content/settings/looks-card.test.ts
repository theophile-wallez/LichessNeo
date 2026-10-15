import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { Pack, PartKind } from '#shared/packs/pack.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { createLibrary, LICHESS, type Library } from '#content/packs/library.ts';
import { saveBoard, savedBoards } from '#content/packs/saved-boards.ts';
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
): Promise<{ readonly library: Library; readonly looks: LooksCard }> {
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve(packs),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.loadAll();
  const looks = buildLooksCard(kind, library);
  // As the Board & sounds page does.
  library.onChange(looks.mark);
  document.body.append(looks.element);
  return { library, looks };
}

const ringed = (root: HTMLElement): (string | undefined)[] =>
  queryAll(root, '.lr-ext-src-item.active', HTMLElement).map(
    item => item.dataset.lrExtChoice ?? item.dataset.lrExtLichess,
  );

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
    click(looks.element, "[data-lr-ext-choice='custom']");
    expect(library.current('board')).toBe('custom');
    expect(localStorage.getItem('lr-ext-board')).toBe('custom');
    expect(ringed(looks.element)).toEqual(['custom']);
  });

  it('shows a family’s settings only while one of its boards is picked', async () => {
    const { looks } = await card('board');
    const family = (): HTMLElement['hidden'] | undefined =>
      queryOne(looks.element, "[data-lr-ext-family='backlit']", HTMLElement)?.hidden;
    expect(family()).toBe(true);
    click(looks.element, "[data-lr-ext-choice='backlit-forest']");
    expect(family()).toBe(false);
    click(looks.element, "[data-lr-ext-choice='accent']");
    expect(family()).toBe(true);
  });

  it('lists the packs that have the part, or leads to the packs’ page', async () => {
    const pieces = await card('piece', [WOOD, CLICKS]);
    expect(
      queryAll(pieces.looks.element, 'img.lr-ext-src-thumb', HTMLImageElement).map(image =>
        image.getAttribute('src'),
      ),
    ).toEqual([WOOD.pieces?.wN]);
    document.body.innerHTML = '';
    const none = await card('piece');
    const empty = queryOne(none.looks.element, '.lr-ext-looks__empty a', HTMLElement);
    expect(empty?.getAttribute('href')).toBe('#lr-ext-extension/packs');
  });

  it('picks one of Lichess’s own, and tells the page world', async () => {
    document.body.dataset.board = 'wood4';
    const { library, looks } = await card('board');
    looks.showLichess(LICHESS_BOARDS);
    // Not ringed while the extension shows its own board.
    expect(ringed(looks.element)).toEqual(['accent']);
    click(looks.element, "[data-lr-ext-lichess='brown']");
    expect(library.current('board')).toBe(LICHESS);
    expect(window.postMessage).toHaveBeenLastCalledWith(
      { type: 'lr-ext:lichess-look', part: 'board', id: 'brown' },
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
    click(looks.element, `[data-lr-ext-choice='${id}']`);
    click(looks.element, `[data-lr-ext-delete='${id}']`);
    expect(savedBoards()).toEqual([]);
    expect(library.current('board')).toBe('accent');
    expect(queryOne(looks.element, `[data-lr-ext-choice='${id}']`, HTMLElement)).toBeNull();
  });

  it('falls back to a piece set’s WebP where it has no SVG', async () => {
    const { looks } = await card('piece');
    looks.showLichess([{ id: 'pixel', name: 'Pixel', image: 'https://lichess1.org/pixel/wN.svg' }]);
    const image = queryOne(looks.element, 'img', HTMLImageElement);
    image?.dispatchEvent(new Event('error'));
    expect(image?.getAttribute('src')).toBe('https://lichess1.org/pixel/wN.webp');
  });
});
