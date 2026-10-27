import { afterEach, describe, expect, it, vi } from 'vitest';
import { importPacks, type Import } from './assemble.ts';
import { downloadFile, downloadManifest } from './download.ts';
import { fakeGithub, type Files } from '#shared/testing/github.ts';
import { PIECE_NAMES } from './pack.ts';
import { dataUrlBytes } from './sniff.ts';

const text = (value: string): Uint8Array => new TextEncoder().encode(value);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0]);

// A pack with every part, in a folder of a repository, as the docs describe it.
const REPO = 'Ann/Packs';
const LINK = `https://github.com/${REPO}/tree/main/warm%20wood`;
const FULL: Files = new Map([
  [
    'warm wood/pack.json',
    text(
      JSON.stringify({
        name: 'Warm wood',
        pieces: 'pieces/{piece}.svg',
        board: { image: 'board.png', light: '#f2e4cc', dark: '#c4936a' },
        sounds: { capture: 'sounds/capture.mp3', 'move-self': 'sounds/move.mp3' },
      }),
    ),
  ],
  ...PIECE_NAMES.map((name): [string, Uint8Array] => [
    `warm wood/pieces/${name}.svg`,
    text(`<svg xmlns="http://www.w3.org/2000/svg" id="${name}"/>`),
  ]),
  ['warm wood/board.png', PNG],
  ['warm wood/sounds/capture.mp3', MP3],
  ['warm wood/sounds/move.mp3', MP3],
]);

/** A one-file-per-part pack at the root of `ann/packs`, with `overrides`. */
function smallPack(
  manifest: unknown,
  overrides: Record<string, Uint8Array> = {},
): Map<string, Uint8Array> {
  return new Map(
    Object.entries({ 'pack.json': text(JSON.stringify(manifest)), 'b.png': PNG, ...overrides }),
  );
}

// The worker's answers, without the messages: content/packs/import.ts asks for them.
const downloadPacks = (link: string, token = ''): Promise<Import> =>
  importPacks(
    {
      manifest: () => downloadManifest(link, token),
      file: (path, kind) => downloadFile(link, token, path, kind),
    },
    link,
  );

const errorOf = (download: Import): string | null => ('error' in download ? download.error : null);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('importPacks', () => {
  it('reads a pack whole', async () => {
    fakeGithub({ repo: REPO, files: FULL });
    const download = await downloadPacks(LINK);
    if (!('packs' in download)) throw new Error(download.error);
    const [pack] = download.packs;
    if (pack === undefined) throw new Error('no pack');
    expect(download.source).toBe('ann/packs/main/warm wood/');
    expect(pack.id).toBe('ann/packs/main/warm wood/');
    expect(pack.name).toBe('Warm wood');
    expect(pack.link).toBe(LINK);
    expect(Object.keys(pack.pieces ?? {}).toSorted()).toEqual([...PIECE_NAMES].toSorted());
    expect(pack.pieces?.wK).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(new Uint8Array(dataUrlBytes(pack.pieces?.bN ?? ''))).toEqual(
      FULL.get('warm wood/pieces/bN.svg'),
    );
    expect(pack.board).toMatchObject({ light: '#f2e4cc', dark: '#c4936a' });
    expect(pack.board?.image).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(Object.keys(pack.sounds ?? {})).toEqual(['capture', 'move-self']);
    expect(pack.sounds?.capture).toBe('data:audio/mpeg;base64,SUQzBAA=');
  });

  it('reads each board, piece set and sound set a pack.json lists as a pack of its own', async () => {
    const manifest = {
      name: 'Wood',
      board: { image: 'b.png' },
      pieces: [{ name: 'Neo', path: 'neo/{piece}.png' }],
      sounds: [
        { name: 'Clicks', files: { capture: 'c.mp3' } },
        { name: 'Taps', files: { 'move-self': 'c.mp3' } },
      ],
    };
    const pieces = Object.fromEntries(PIECE_NAMES.map(name => [`neo/${name}.png`, PNG]));
    fakeGithub({ repo: 'ann/packs', files: smallPack(manifest, { ...pieces, 'c.mp3': MP3 }) });
    const download = await downloadPacks('https://github.com/ann/packs');
    if (!('packs' in download)) throw new Error(download.error);
    expect(download.source).toBe('ann/packs/HEAD/');
    expect(
      download.packs.map(({ id, name, packName, board, pieces: set, sounds }) => ({
        id,
        name,
        packName,
        parts: [board && 'board', set && 'pieces', sounds && Object.keys(sounds)].filter(Boolean),
      })),
    ).toEqual([
      { id: 'ann/packs/HEAD/', name: 'Wood', packName: undefined, parts: ['board'] },
      { id: 'ann/packs/HEAD/#piece:Neo', name: 'Neo', packName: 'Wood', parts: ['pieces'] },
      {
        id: 'ann/packs/HEAD/#sound:Clicks',
        name: 'Clicks',
        packName: 'Wood',
        parts: [['capture']],
      },
      { id: 'ann/packs/HEAD/#sound:Taps', name: 'Taps', packName: 'Wood', parts: [['move-self']] },
    ]);
  });

  it('reads a private repository through the API, with the token', async () => {
    const github = fakeGithub({
      repo: 'ann/packs',
      files: smallPack({ name: 'B', board: { image: 'b.png' } }),
      token: 't0k',
    });
    expect(errorOf(await downloadPacks('https://github.com/ann/packs'))).toBe(
      'There is no pack.json there. A private repository needs a token.',
    );
    expect(errorOf(await downloadPacks('https://github.com/ann/packs', 'wrong'))).toBe(
      'GitHub turned the token down.',
    );
    const download = await downloadPacks('https://github.com/ann/packs', ' t0k ');
    expect(errorOf(download)).toBeNull();
    expect(github.requests.at(-1)).toEqual({
      url: 'https://api.github.com/repos/ann/packs/contents/b.png',
      token: 't0k',
    });
  });

  it.each([
    ['https://gitlab.com/ann/packs', smallPack({}), 'That is not a link to a folder on GitHub.'],
    [
      'https://github.com/ann/other',
      smallPack({}),
      'There is no pack.json there. A private repository needs a token.',
    ],
    [
      'https://github.com/ann/packs',
      new Map([['pack.json', text('{name:')]]),
      'pack.json is not valid JSON.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'Empty' }),
      'pack.json has no pieces, board or sounds.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'B', board: { image: 'b.png', dark: 'brown' } }),
      'pack.json: "board.dark" is not right.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'B', board: { image: 'gone.png' } }),
      'gone.png is not there.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'B', board: { image: 'b.png' } }, { 'b.png': text('<html>') }),
      'b.png is not an image.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'S', sounds: { capture: 'b.png' } }),
      'b.png is not a sound.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack({ name: 'P', pieces: '{piece}.png' }, { 'wK.png': PNG }),
      'wQ.png is not there.',
    ],
    [
      'https://github.com/ann/packs',
      smallPack(
        { name: 'B', board: { image: 'b.png' } },
        { 'b.png': new Uint8Array(2 * 1024 * 1024 + 1) },
      ),
      'b.png is over 2 MB.',
    ],
  ])('turns down %s when it serves what it should not', async (link, files, error) => {
    fakeGithub({ repo: 'ann/packs', files });
    expect(errorOf(await downloadPacks(link))).toBe(error);
  });

  it('turns down a pack over 16 MB in all', async () => {
    const sounds = Object.fromEntries(
      [
        'move-self',
        'move-opponent',
        'move-check',
        'capture',
        'castle',
        'promote',
        'premove',
        'illegal',
        'notify',
      ].map(name => [name, `${name}.mp3`]),
    );
    const big = new Uint8Array(1.9 * 1024 * 1024).fill(0xff);
    const files = smallPack(
      { name: 'Loud', sounds },
      Object.fromEntries(Object.values(sounds).map(file => [file, big])),
    );
    fakeGithub({ repo: 'ann/packs', files });
    expect(errorOf(await downloadPacks('https://github.com/ann/packs'))).toBe(
      'The pack is over 16 MB.',
    );
  });

  it('counts a file’s bytes as they come, whatever its Content-Length says', async () => {
    // GitHub gzips SVGs: the header gives the packed size, not what it unpacks to.
    const files = smallPack({ name: 'B', board: { image: 'b.png' } });
    fakeGithub({ repo: 'ann/packs', files });
    const github = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      if (!input.endsWith('/b.png')) return github(input, init);
      const huge = new Uint8Array(3 * 1024 * 1024);
      return new Response(huge, { headers: { 'content-length': '100' } });
    });
    expect(errorOf(await downloadPacks('https://github.com/ann/packs'))).toBe(
      'b.png is over 2 MB.',
    );
  });

  it('reads a few files at once, and starts no more once one fails', async () => {
    const files = smallPack({ name: 'P', pieces: '{piece}.png' }, { 'wK.png': text('<html>') });
    fakeGithub({ repo: 'ann/packs', files });
    const github = globalThis.fetch;
    const asked: string[] = [];
    const gate = Promise.withResolvers<void>();
    let answered = 0;
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      asked.push(input);
      if (input.endsWith('/wK.png') || input.endsWith('/pack.json')) return github(input, init);
      // The other pieces answer once wK has failed.
      await gate.promise;
      answered += 1;
      return new Response(PNG);
    });
    expect(errorOf(await downloadPacks('https://github.com/ann/packs'))).toBe(
      'wK.png is not an image.',
    );
    gate.resolve();
    await vi.waitFor(() => expect(answered).toBe(5));
    // pack.json, then six pieces at once: the six others never start.
    expect(asked).toHaveLength(7);
  });

  it('says so when GitHub can’t be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    expect(errorOf(await downloadPacks(LINK))).toBe('GitHub could not be reached.');
  });
});
