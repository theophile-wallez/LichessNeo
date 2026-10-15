import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  boardThumbnail,
  lichessCurrent,
  lookName,
  parseLichessLooks,
  readLichessLooks,
} from './lichess-looks.ts';

// `/dasher`'s answer, cut to what the page reads.
const DASHER = {
  board: {
    d2: {
      list: [
        { name: 'brown', file: 'svg/brown.svg' },
        { name: 'wood4', file: 'wood4.jpg' },
      ],
    },
  },
  piece: { d2: { list: [{ name: 'cburnett' }, { name: 'pixel' }] } },
  sound: { list: ['silent Silent', 'standard Standard', 'speech Speech', 'robot'] },
};

const ASSETS = 'https://lichess1.org/assets/';

afterEach(() => {
  delete document.body.dataset.assetUrl;
  delete document.body.dataset.board;
  delete document.body.dataset.pieceSet;
});

describe('Lichess’s looks', () => {
  it('name each id as the menu would', () => {
    expect(lookName('wood4')).toBe('Wood4');
    expect(lookName('blue-marble')).toBe('Blue marble');
    expect(lookName('')).toBe('');
  });

  it('find a board’s thumbnail, or the whole board for an SVG one', () => {
    expect(boardThumbnail('wood4.jpg')).toBe('images/board/wood4.thumbnail.jpg');
    expect(boardThumbnail('blue-marble.png')).toBe('images/board/blue-marble.thumbnail.png');
    expect(boardThumbnail('svg/brown.svg')).toBe('images/board/svg/brown.svg');
  });

  it('list the boards, the piece sets and the sound sets, without speech', () => {
    expect(parseLichessLooks(DASHER, ASSETS)).toEqual({
      board: [
        {
          id: 'brown',
          name: 'Brown',
          image: `${ASSETS}images/board/svg/brown.svg`,
          whole: true,
        },
        {
          id: 'wood4',
          name: 'Wood4',
          image: `${ASSETS}images/board/wood4.thumbnail.jpg`,
          whole: false,
        },
      ],
      piece: [
        { id: 'cburnett', name: 'Cburnett', image: `${ASSETS}piece/cburnett/wN.svg` },
        { id: 'pixel', name: 'Pixel', image: `${ASSETS}piece/pixel/wN.svg` },
      ],
      sound: [
        { id: 'silent', name: 'Silent', image: null },
        { id: 'standard', name: 'Standard', image: null },
        { id: 'robot', name: 'Robot', image: null },
      ],
    });
  });

  it('read nothing from an answer out of shape', () => {
    expect(parseLichessLooks({ board: {} }, ASSETS)).toBeNull();
    expect(parseLichessLooks('<html>', ASSETS)).toBeNull();
  });

  it('say what Lichess shows, from <body>', () => {
    document.body.dataset.board = 'wood4';
    document.body.dataset.pieceSet = 'pixel';
    expect(lichessCurrent('board')).toBe('wood4');
    expect(lichessCurrent('piece')).toBe('pixel');
    expect(lichessCurrent('sound')).toBeUndefined();
  });

  it('are read once, and again only after a failed read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response('nope', { status: 500 })),
    );
    vi.stubGlobal('fetch', fetch);
    // No assets' origin to draw the pictures from.
    expect(await readLichessLooks()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    document.body.dataset.assetUrl = 'https://lichess1.org';
    expect(await readLichessLooks()).toBeNull();
    fetch.mockImplementation(() => Promise.resolve(Response.json(DASHER)));
    const looks = await readLichessLooks();
    expect(looks?.piece.map(look => look.image)).toEqual([
      `${ASSETS}piece/cburnett/wN.svg`,
      `${ASSETS}piece/pixel/wN.svg`,
    ]);
    expect(await readLichessLooks()).toBe(looks);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe('/dasher');
  });
});
