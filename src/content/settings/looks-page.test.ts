import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { SYNTH_SET } from '#shared/sounds.ts';
import { flush } from '#shared/testing/timers.ts';
import { createLibrary, type Library } from '#content/packs/library.ts';
import { buildLooksPage } from './looks-page.ts';

// The preview's markup names its messages as its module loads.
const i18n = vi.hoisted(() => {
  const messages = { getMessage: (name: string): string => name };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

const DASHER = {
  board: { d2: { list: [{ name: 'wood4', file: 'wood4.jpg' }] } },
  piece: { d2: { list: [{ name: 'pixel' }] } },
  sound: { list: ['standard Standard', 'piano Piano'] },
};

const fetchDasher = vi.fn<typeof fetch>();

function page(): {
  readonly library: Library;
  readonly layout: HTMLElement;
  readonly show: (visible: boolean) => void;
} {
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  const { elements, show } = buildLooksPage(library);
  document.body.append(...elements);
  const [layout] = elements;
  if (!layout) throw new Error('no page');
  return { library, layout, show };
}

const previews = (): unknown[] =>
  vi
    .mocked(window.postMessage)
    .mock.calls.map(([message]): unknown => message)
    .filter(message => JSON.stringify(message).includes('looks-preview'));
const preview = (action: string): unknown => ({ type: 'ln-ext:looks-preview', action });

const lichessTiles = (layout: HTMLElement, part: string): (string | undefined)[] =>
  queryAll(layout, `[data-ln-ext-part='${part}'] [data-ln-ext-lichess]`, HTMLElement).map(
    tile => tile.dataset.lnExtLichess,
  );

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n });
  vi.stubGlobal('fetch', fetchDasher);
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  document.body.dataset.assetUrl = 'https://lichess1.org';
});

afterEach(() => {
  document.body.innerHTML = '';
  delete document.body.dataset.assetUrl;
  localStorage.clear();
  fetchDasher.mockReset();
});

describe('the settings’ Board & sounds page', () => {
  it('reads Lichess’s lists again the next time it opens, if they couldn’t be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchDasher.mockResolvedValue(new Response('', { status: 503 }));
    const { layout, show } = page();
    show(true);
    await flush();
    expect(queryOne(layout, '.ln-ext-looks__empty', HTMLElement)?.textContent).toBe(
      'looksLichessFailed',
    );
    fetchDasher.mockResolvedValue(Response.json(DASHER));
    show(false);
    show(true);
    await flush();
    expect(lichessTiles(layout, 'board')).toEqual(['wood4']);
  });

  it('draws its preview and lists Lichess’s own as it opens, once', async () => {
    const { layout, show } = page();
    show(true);
    await flush();
    show(true);
    expect(previews()).toEqual([preview('draw')]);
    expect(lichessTiles(layout, 'board')).toEqual(['wood4']);
    expect(lichessTiles(layout, 'piece')).toEqual(['pixel']);
    expect(lichessTiles(layout, 'sound')).toEqual(['standard', 'piano']);
    show(false);
    show(true);
    expect(previews()).toEqual([preview('draw'), preview('draw')]);
  });

  it('plays a move as a sound set is picked, once it’s picked', () => {
    const { layout } = page();
    // The set the move sounds in: the one kept as the preview hears of it.
    const heard: (string | null)[] = [];
    vi.mocked(window.postMessage).mockImplementation(() => {
      heard.push(localStorage.getItem('ln-ext-sounds'));
    });
    queryOne(
      layout,
      `[data-ln-ext-part='sound'] [data-ln-ext-choice='${SYNTH_SET}']`,
      HTMLElement,
    )?.click();
    expect(previews()).toEqual([preview('step')]);
    expect(heard).toEqual([SYNTH_SET]);
    queryOne(
      layout,
      "[data-ln-ext-part='board'] [data-ln-ext-choice='accent']",
      HTMLElement,
    )?.click();
    expect(previews()).toEqual([preview('step')]);
  });

  it('rings a pick made elsewhere, as in the user menu', () => {
    const { library, layout } = page();
    library.choose('board', 'custom');
    expect(
      queryAll(layout, "[data-ln-ext-part='board'] .ln-ext-src-item.active", HTMLElement).map(
        item => item.dataset.lnExtChoice,
      ),
    ).toEqual(['custom']);
  });
});
