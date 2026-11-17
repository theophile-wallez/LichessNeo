import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageKey } from '#shared/storage.ts';
import {
  applyPageState,
  type DasherPayload,
  readKeptDasher,
  readPageDasherState,
  storeDasherText,
} from './cache.ts';

const samplePayload = (overrides: Partial<DasherPayload> = {}): DasherPayload => ({
  user: { id: 'alice', name: 'Alice', patron: true, patronColor: 3 },
  lang: {
    current: 'en-US',
    accepted: ['en-US', 'fr-FR'],
    list: [
      ['en-US', 'English'],
      ['fr-FR', 'Français'],
    ],
  },
  sound: { list: ['silent', 'standard', 'piano'] },
  background: {
    current: 'dark',
    image: '',
    gallery: {
      light: { images: ['a.jpg'], montage2: 'm2.jpg', montage4: 'm4.jpg' },
      dark: { images: ['b.jpg'], montage2: 'd2.jpg', montage4: 'd4.jpg' },
    },
  },
  board: {
    is3d: false,
    d2: { current: 'brown', list: [{ name: 'brown', featured: true }] },
    d3: { current: 'Woodi', list: [{ name: 'Woodi', featured: true }] },
  },
  piece: {
    d2: { current: 'cburnett', list: [{ name: 'cburnett', featured: true }] },
    d3: { current: 'Basic', list: [{ name: 'Basic', featured: true }] },
  },
  coach: false,
  streamer: true,
  ...overrides,
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
  delete document.body.dataset.user;
  delete document.body.dataset.theme;
  delete document.body.dataset.board;
  delete document.body.dataset.board3d;
  delete document.body.dataset.pieceSet;
  delete document.body.dataset.pieceSet3d;
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('readPageDasherState', () => {
  it('reads the signed-in user and live board/theme attributes from the page', () => {
    document.documentElement.lang = 'fr-FR';
    document.body.dataset.user = 'alice';
    document.body.dataset.theme = 'light';
    document.body.dataset.board = 'blue-marble';
    document.body.dataset.board3d = 'Staunton';
    document.body.dataset.pieceSet = 'merida';
    document.body.dataset.pieceSet3d = 'Experimental';
    const wrap = document.createElement('div');
    wrap.id = 'main-wrap';
    wrap.classList.add('is3d');
    document.body.append(wrap);

    expect(readPageDasherState()).toEqual({
      user: 'alice',
      lang: 'fr-FR',
      is3d: true,
      theme: 'light',
      board: 'blue-marble',
      board3d: 'Staunton',
      pieceSet: 'merida',
      pieceSet3d: 'Experimental',
    });
  });

  it('defaults user to null and omits missing dataset picks when signed out', () => {
    expect(readPageDasherState()).toEqual({
      user: null,
      lang: '',
      is3d: false,
    });
  });
});

describe('applyPageState', () => {
  it('reconciles cached picks with the current page without losing option lists', () => {
    const updated = applyPageState(samplePayload(), {
      user: 'alice',
      lang: 'fr-FR',
      is3d: true,
      theme: 'light',
      board: 'green',
      board3d: 'Wax',
      pieceSet: 'alpha',
      pieceSet3d: 'Staunton',
    });

    expect(updated.lang.current).toBe('fr-FR');
    expect(updated.lang.list).toHaveLength(2);
    expect(updated.background.current).toBe('light');
    expect(updated.board.is3d).toBe(true);
    expect(updated.board.d2.current).toBe('green');
    expect(updated.board.d3.current).toBe('Wax');
    expect(updated.piece.d2.current).toBe('alpha');
    expect(updated.piece.d3.current).toBe('Staunton');
  });
});

describe('storeDasherText and readKeptDasher', () => {
  it('stores valid `/dasher` JSON, rejects another user’s cache, and marks old entries stale', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));

    expect(storeDasherText('not json')).toBeNull();
    expect(storeDasherText('{"lang":{}}')).toBeNull();

    const saved = storeDasherText(JSON.stringify(samplePayload()));
    expect(saved?.user?.id).toBe('alice');

    expect(readKeptDasher({ user: 'bob', lang: 'en-US', is3d: false })).toBeNull();
    expect(readKeptDasher({ user: null, lang: 'en-US', is3d: false })).toBeNull();

    const fresh = readKeptDasher({
      user: 'alice',
      lang: 'fr-FR',
      is3d: false,
      theme: 'light',
    });
    expect(fresh?.stale).toBe(false);
    expect(fresh?.data.lang.current).toBe('fr-FR');
    expect(fresh?.data.background.current).toBe('light');

    vi.advanceTimersByTime(10 * 60 * 1000);
    const stale = readKeptDasher({ user: 'alice', lang: 'en-US', is3d: false });
    expect(stale?.stale).toBe(true);
  });

  it('keeps signed-out `/dasher` responses separate from signed-in accounts', () => {
    const anon = samplePayload();
    delete anon.user;
    storeDasherText(JSON.stringify(anon));

    expect(readKeptDasher({ user: 'alice', lang: 'en-US', is3d: false })).toBeNull();
    expect(readKeptDasher({ user: null, lang: 'en-US', is3d: false })?.data.user).toBeUndefined();

    localStorage.setItem(
      StorageKey.dasherCache,
      JSON.stringify({ user: 'alice', at: Date.now(), data: anon }),
    );
    expect(readKeptDasher({ user: 'alice', lang: 'en-US', is3d: false })).toBeNull();
  });
});
