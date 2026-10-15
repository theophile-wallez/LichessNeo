import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { createElement, queryAll } from '#shared/dom.ts';
import { fakeSoundPlayer } from '#page/sounds/fixtures/sound-player.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { lichessLooks, pickLichessLook } from './index.ts';

const ASSETS = 'https://lichess1.org/assets/';

let fetchPref: Mock<typeof fetch>;
let changeSet: Mock<(set: string) => void>;

/** Lichess's `site`: its asset helper, the files it hashed, and its sound player. */
function stubSite(hashed: readonly string[]): void {
  const site = {
    asset: { url: (path: string) => `${ASSETS}${path}` },
    manifest: { hashed: Object.fromEntries(hashed.map(path => [path, 'abc123'])) },
    sound: { ...fakeSoundPlayer().sound, changeSet },
  };
  Object.assign(window, { site });
}

/** The pref each save posted, as lila's `/pref/<field>` route reads it. */
const posted = (): string[] =>
  fetchPref.mock.calls.map(([url, init]) => {
    const header = new Headers(init?.headers).get('X-Requested-With');
    const body = init?.body instanceof URLSearchParams ? init.body.toString() : null;
    return `${init?.method} ${typeof url === 'string' ? url : null} ${body} ${header}`;
  });

const pieceImage = (variable: string): string =>
  document.body.style.getPropertyValue(variable).trim();

beforeEach(() => {
  fetchPref = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  vi.stubGlobal('fetch', fetchPref);
  changeSet = vi.fn<(set: string) => void>();
  stubSite(['piece/cburnett/wP.webp']);
});

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.removeAttribute('style');
  for (const key of Object.keys(document.body.dataset)) delete document.body.dataset[key];
});

describe('a Lichess look picked in the settings', () => {
  it('saves a board as Lichess’s own pref, and names it on the page', () => {
    pickLichessLook({ part: 'board', id: 'blue3' });
    expect(posted()).toEqual(['POST /pref/theme theme=blue3 XMLHttpRequest']);
    expect(document.body.dataset.board).toBe('blue3');
    expect(changeSet).not.toHaveBeenCalled();
  });

  it('shows a piece set at once, in WebP where Lichess has it so', () => {
    pickLichessLook({ part: 'piece', id: 'cburnett' });
    expect(posted()).toEqual(['POST /pref/pieceSet pieceSet=cburnett XMLHttpRequest']);
    expect(document.body.dataset.pieceSet).toBe('cburnett');
    expect(pieceImage('---white-pawn')).toBe(`url(${ASSETS}piece/cburnett/wP.webp)`);
    expect(pieceImage('---black-king')).toBe(`url(${ASSETS}piece/cburnett/bK.webp)`);
  });

  it('falls back on SVG for a set Lichess has no WebP of', () => {
    pickLichessLook({ part: 'piece', id: 'alpha' });
    expect(pieceImage('---white-pawn')).toBe(`url(${ASSETS}piece/alpha/wP.svg)`);
    expect(pieceImage('---black-queen')).toBe(`url(${ASSETS}piece/alpha/bQ.svg)`);
  });

  it('switches Lichess’s player to a sound set as it saves it', () => {
    pickLichessLook({ part: 'sound', id: 'piano' });
    expect(posted()).toEqual(['POST /pref/soundSet soundSet=piano XMLHttpRequest']);
    expect(document.body.dataset.soundSet).toBe('piano');
    expect(changeSet).toHaveBeenCalledWith('piano');
  });

  it('only warns when the save is refused or fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchPref.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const offline = new TypeError('offline');
    fetchPref.mockRejectedValueOnce(offline);
    pickLichessLook({ part: 'board', id: 'green' });
    pickLichessLook({ part: 'board', id: 'brown' });
    await flush();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith('[LichessReimagined] theme unsaved', 403);
    expect(warn).toHaveBeenCalledWith('[LichessReimagined] theme unsaved', offline);
    expect(document.body.dataset.board).toBe('brown');
  });
});

let stopListening = (): void => {};

const receive = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
};

describe('the looks feature', () => {
  beforeEach(() => {
    stopListening = trackListeners(window);
    lichessLooks.start();
  });

  afterEach(() => {
    stopListening();
    document.body.replaceChildren();
  });

  it('applies the picks the content script posts', () => {
    receive({ type: 'lr-ext:lichess-look', part: 'board', id: 'wood' });
    receive({ type: 'lr-ext:lichess-look', part: 'pieces', id: 'merida' });
    expect(document.body.dataset.board).toBe('wood');
    expect(posted()).toEqual(['POST /pref/theme theme=wood XMLHttpRequest']);
  });

  it('draws the settings’ preview board when asked', () => {
    const host = createElement('div', { className: 'lr-ext-looks-preview__board' });
    document.body.append(host);
    receive({ type: 'lr-ext:looks-preview', action: 'draw' });
    expect(queryAll(host, 'cg-board > piece', HTMLElement)).toHaveLength(32);
  });
});
