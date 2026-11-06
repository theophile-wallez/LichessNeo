import { describe, expect, it } from 'vitest';
import { importPacks } from './assemble.ts';
import { type LocalFile, localFolder, localSourceId, manifestPath } from './local.ts';
import { PIECE_NAMES } from './pack.ts';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>';

const local = (path: string, data: Uint8Array | string): LocalFile => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return { path, size: bytes.length, read: () => Promise.resolve(bytes) };
};

const svg = (path: string): LocalFile => local(path, SVG);

const pieces = (folder: string): LocalFile[] =>
  PIECE_NAMES.map(piece => svg(`${folder}${piece}.svg`));

const json = (manifest: object): string => JSON.stringify(manifest);

describe('localSourceId', () => {
  it("is the pack's name, with nothing that would start an item's id", () => {
    expect(localSourceId('Warm Wood')).toBe('local:warm wood/');
    expect(localSourceId('a/b#c')).toBe('local:a-b-c/');
  });
});

describe('manifestPath', () => {
  it('finds the shallowest pack.json, not a hidden one', () => {
    const files = [
      local('a/b/pack.json', '{}'),
      local('a/pack.json', '{}'),
      local('.x/pack.json', ''),
    ];
    expect(manifestPath(files)).toBe('a/pack.json');
    expect(manifestPath([local('board.svg', '')])).toBeNull();
  });
});

describe('localFolder', () => {
  it("reads a folder's pack.json and the files it names, under the pack's name", async () => {
    const files = [
      local('mine/pack.json', json({ name: 'Mine', board: { image: 'board.svg' } })),
      svg('mine/board.svg'),
    ];
    const imported = await importPacks(localFolder(files, { kind: 'pack' }), '');
    expect('packs' in imported && imported.source).toBe('local:mine/');
    expect('packs' in imported && imported.packs[0]?.board?.image).toMatch(
      /^data:image\/svg\+xml;/,
    );
  });

  it('finds picked files, which come with no folder, by their names', async () => {
    const files = [
      local('pack.json', json({ name: 'Mine', board: { image: 'deep/board.svg' } })),
      svg('board.svg'),
    ];
    const imported = await importPacks(localFolder(files, { kind: 'pack' }), '');
    expect('packs' in imported && imported.packs).toHaveLength(1);
  });

  it('makes a pack.json for loose files, of the kind of their zone', async () => {
    const imported = await importPacks(
      localFolder(pieces(''), { kind: 'piece', name: 'Mochi' }),
      '',
    );
    expect('packs' in imported && imported.packs.map(pack => pack.name)).toEqual(['Mochi']);
    expect('packs' in imported && Object.keys(imported.packs[0]?.pieces ?? {})).toHaveLength(12);
  });

  it('wants a pack.json in what is dropped as a pack', async () => {
    const imported = await importPacks(localFolder(pieces(''), { kind: 'pack' }), '');
    expect(imported).toEqual({ error: 'There is no pack.json there.' });
  });

  it('says which file is wrong, not that the others were stopped', async () => {
    const files = [
      local(
        'pack.json',
        json({ name: 'Mine', pieces: '{piece}.svg', board: { image: 'board.svg' } }),
      ),
      ...pieces('').filter(file => file.path !== 'bP.svg'),
      svg('board.svg'),
    ];
    const imported = await importPacks(localFolder(files, { kind: 'pack' }), '');
    expect(imported).toEqual({ error: 'bP.svg is not there.' });
  });

  it('checks the files as a pack’s are', async () => {
    const files = [local('Move.mp3', 'not a sound')];
    const imported = await importPacks(localFolder(files, { kind: 'sound', name: 'Clicks' }), '');
    expect(imported).toEqual({ error: 'Move.mp3 is not a sound.' });
  });

  it("names the user's own file when one is too big", async () => {
    const big: LocalFile = {
      path: 'Move.mp3',
      size: 3 * 1024 * 1024,
      read: () => Promise.reject(new Error('Read')),
    };
    const imported = await importPacks(localFolder([big], { kind: 'sound', name: 'Clicks' }), '');
    expect('error' in imported && imported.error).toMatch(/^Move\.mp3 /);
  });
});
