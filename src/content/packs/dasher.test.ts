import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { watchDasher } from './dasher.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { createLibrary, LICHESS, type Library } from './library.ts';
import type { Pack } from '#shared/packs/pack.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);

// Lichess's user menu, with one panel open, as snabbdom draws it.
const PANELS = {
  board:
    '<div class="sub board d2"><button class="head">Board</button>' +
    '<div class="list"><button class="active"><span></span></button><button><span></span></button></div></div>',
  piece:
    '<div class="sub piece d2"><button class="head">Piece set</button>' +
    '<div class="list"><button class="no-square active"><piece></piece></button></div></div>',
  sound:
    '<div class="sub sound standard"><button class="head">Sound</button><div class="content">' +
    '<input type="range"><div class="selector"><button class="active">Standard</button>' +
    '<button>Piano</button></div></div></div>',
};

let stopListeners: () => void;

function openPanel(kind: keyof typeof PANELS): HTMLElement {
  const app = document.getElementById('dasher_app');
  if (app) app.innerHTML = PANELS[kind];
  const panel = queryOne(document, `#dasher_app .sub.${kind}`, HTMLElement);
  if (!panel) throw new Error('no panel');
  return panel;
}

async function start(
  packs: readonly Pack[],
  readAll = (): Promise<readonly Pack[]> => Promise.resolve(packs),
): Promise<Library> {
  const library = createLibrary({
    readPicked: () => Promise.resolve(packs),
    readAll,
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.ready;
  watchDasher(library);
  return library;
}

const tab = (panel: HTMLElement, view: string): HTMLElement | null =>
  queryOne(panel, `.cdc-src-tabs button[data-cdc-tab="${view}"]`, HTMLElement);
// A tile's name is its label, a sound's its text.
const names = (panel: HTMLElement): (string | null)[] =>
  queryAll(panel, '.cdc-src-item', HTMLElement).map(
    item => item.getAttribute('aria-label') ?? item.textContent,
  );

beforeEach(() => {
  stopListeners = trackListeners(document);
  document.body.innerHTML =
    '<div id="top"><div class="dasher"><div id="dasher_app"></div></div></div>';
});

afterEach(() => {
  stopListeners();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('the user menu’s panels', () => {
  it('get an Extension and a Lichess tab, open on what the page shows', async () => {
    localStorage.setItem('cdc-pieces', WOOD.id);
    localStorage.setItem('cdc-sounds', LICHESS);
    await start([WOOD, CLICKS]);
    const board = openPanel('board');
    await flush();
    expect(
      queryAll(board, '.cdc-src-tabs button', HTMLElement).map(button => button.textContent),
    ).toEqual(['Extension', 'Lichess']);
    // Our blue board, then only the packs with a board, named in their tooltip only.
    expect(board.dataset.cdcView).toBe('extension');
    expect(names(board)).toEqual(['Blue', 'Pack ann/packs/main/wood/']);
    expect(board.querySelector('.cdc-src-name')).toBeNull();
    expect(queryOne(board, '.cdc-src-item.active', HTMLElement)?.dataset.cdcChoice).toBe('blue');
    const piece = openPanel('piece');
    await flush();
    expect(piece.dataset.cdcView).toBe('extension');
    expect(piece.dataset.cdcSrcOn).toBe('extension');
    expect(queryOne(piece, '.cdc-src-item.active', HTMLElement)?.dataset.cdcChoice).toBe(WOOD.id);
    const sound = openPanel('sound');
    await flush();
    expect(sound.dataset.cdcView).toBe(LICHESS);
  });

  it('pick a theme or a pack, and hand the part back to Lichess from its own list', async () => {
    const library = await start([WOOD]);
    const panel = openPanel('board');
    await flush();
    queryOne(panel, `.cdc-src-item[data-cdc-choice="${WOOD.id}"]`, HTMLElement)?.click();
    expect(library.current('board')).toBe(WOOD.id);
    expect(panel.dataset.cdcSrcOn).toBe('extension');
    tab(panel, LICHESS)?.click();
    expect(panel.dataset.cdcView).toBe(LICHESS);
    queryOne(panel, '.list > button', HTMLElement)?.click();
    expect(library.current('board')).toBe(LICHESS);
    expect(panel.dataset.cdcSrcOn).toBe(LICHESS);
    tab(panel, 'extension')?.click();
    queryOne(panel, '.cdc-src-item[data-cdc-choice="blue"]', HTMLElement)?.click();
    expect(library.current('board')).toBe('blue');
  });

  it('list the sound packs beside the volume, and Lichess’s sets hand the sounds back', async () => {
    const library = await start([WOOD, CLICKS]);
    const panel = openPanel('sound');
    await flush();
    expect(panel.querySelector('.content > .cdc-src-choices')).not.toBeNull();
    expect(names(panel)).toEqual(['Pack ann/packs/main/wood/', 'Pack ann/packs/main/clicks/']);
    library.choose('sound', CLICKS.id);
    queryAll(panel, '.selector > button', HTMLElement)[1]?.click();
    expect(library.current('sound')).toBe(LICHESS);
  });

  it('list the packs read once the menu opens, and lead to the settings to import one', async () => {
    const all = Promise.withResolvers<readonly Pack[]>();
    await start([], () => all.promise);
    const panel = openPanel('sound');
    await flush();
    expect(panel.querySelector('.cdc-src-empty')?.textContent).toBe(
      'No sound set of the extension yet: import your own from GitHub.',
    );
    expect(queryOne(panel, '.cdc-src-import-link', HTMLAnchorElement)?.getAttribute('href')).toBe(
      '/account/profile#cdc-extension',
    );
    all.resolve([WOOD, CLICKS]);
    await flush();
    expect(names(panel)).toEqual(['Pack ann/packs/main/wood/', 'Pack ann/packs/main/clicks/']);
    expect(panel.querySelector('.cdc-src-empty')).toBeNull();
  });

  it('say so when the packs can’t be read, and try again on the next opening', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const readAll = vi
      .fn<() => Promise<readonly Pack[]>>()
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValue([WOOD]);
    await start([], readAll);
    const panel = openPanel('board');
    await flush();
    expect(names(panel)).toEqual(['Blue']);
    expect(panel.querySelector('.cdc-src-empty')?.textContent).toBe(
      'The imported packs could not be read.',
    );
    expect(error).toHaveBeenCalledOnce();
    // Closed, then opened again.
    const app = document.getElementById('dasher_app');
    if (app) app.innerHTML = '';
    await flush();
    const again = openPanel('board');
    await flush();
    expect(names(again)).toEqual(['Blue', 'Pack ann/packs/main/wood/']);
    expect(readAll).toHaveBeenCalledTimes(2);
  });

  it('drop a removed pack from the lists', async () => {
    const library = await start([WOOD, CLICKS]);
    const panel = openPanel('sound');
    await flush();
    await library.remove(WOOD.id);
    expect(names(panel)).toEqual(['Pack ann/packs/main/clicks/']);
  });
});
