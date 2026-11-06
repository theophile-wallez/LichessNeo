import { describe, expect, it } from 'vitest';
import { fakePack, IMAGE } from '#shared/testing/packs.ts';
import { importPacks } from './assemble.ts';
import { exportFiles } from './export.ts';
import { onlyPart } from './items.ts';
import { localFolder } from './local.ts';
import type { Pack } from './pack.ts';
import { readZip, createZip } from './zip.ts';

// Real bytes, which the import checks: a PNG's signature, an MP3's ID3 tag.
const PNG = `data:image/png;base64,${btoa('\x89PNG\r\n\x1a\n')}`;
const MP3 = `data:audio/mpeg;base64,${btoa('ID3\x03\x00')}`;

const part = (id: string, kind: 'board' | 'piece' | 'sound', name: string): Pack => {
  const pack = { ...onlyPart(fakePack(id, [kind]), kind), name };
  if (kind === 'board')
    return { ...pack, board: { image: PNG, light: '#eeeeee', dark: '#333333' } };
  if (kind === 'sound') return { ...pack, sounds: { capture: MP3, 'move-self': MP3 } };
  return pack;
};

const manifestOf = (files: ReturnType<typeof exportFiles>): unknown =>
  JSON.parse(new TextDecoder().decode(files.find(file => file.path === 'pack.json')?.data));

describe('exportFiles', () => {
  it("writes one part of a kind as the pack's own", () => {
    const files = exportFiles({
      name: 'Mine',
      parts: [part('a', 'board', 'Maple'), part('b', 'piece', 'Mochi')],
    });
    expect(manifestOf(files)).toEqual({
      name: 'Mine',
      board: { image: 'board.png', light: '#eeeeee', dark: '#333333' },
      pieces: 'pieces/{piece}.svg',
    });
    expect(files.map(file => file.path)).toContain('pieces/wK.svg');
  });

  it('lists several of a kind, under names and folders apart', () => {
    const files = exportFiles({
      name: 'Mine',
      parts: [part('a', 'sound', 'Clicks'), part('b', 'sound', 'Clicks')],
    });
    expect(manifestOf(files)).toEqual({
      name: 'Mine',
      sounds: [
        {
          name: 'Clicks',
          files: {
            capture: 'sounds/clicks/capture.mp3',
            'move-self': 'sounds/clicks/move-self.mp3',
          },
        },
        {
          name: 'Clicks 2',
          files: {
            capture: 'sounds/clicks-2/capture.mp3',
            'move-self': 'sounds/clicks-2/move-self.mp3',
          },
        },
      ],
    });
  });

  it('leaves the extensions off pieces of mixed types', () => {
    const mixed = part('a', 'piece', 'Mixed');
    const pieces = mixed.pieces && { ...mixed.pieces, wK: IMAGE };
    const files = exportFiles({ name: 'Mine', parts: [{ ...mixed, ...(pieces && { pieces }) }] });
    expect(manifestOf(files)).toEqual({ name: 'Mine', pieces: 'pieces/{piece}' });
    expect(files.map(file => file.path)).toContain('pieces/wK');
  });

  it("makes a zip that imports as the same parts, the lone ones as the pack's own", async () => {
    const parts = [
      part('a', 'board', 'Maple'),
      part('b', 'piece', 'Mochi'),
      part('c', 'piece', 'Pop'),
      part('d', 'sound', 'Clicks'),
    ];
    const zip = new Uint8Array(await createZip(exportFiles({ name: 'Mine', parts })).arrayBuffer());
    const imported = await importPacks(localFolder(readZip(zip), { kind: 'pack' }), '');
    if (!('packs' in imported)) throw new Error(imported.error);
    expect(imported.packs.map(pack => pack.name).toSorted()).toEqual(['Mine', 'Mochi', 'Pop']);
    const board = imported.packs.find(pack => pack.board);
    expect(board?.board).toEqual({ image: PNG, light: '#eeeeee', dark: '#333333' });
    const pop = imported.packs.find(pack => pack.name === 'Pop');
    expect(pop?.pieces).toEqual(parts[2]?.pieces);
    expect(imported.packs.find(pack => pack.sounds)?.sounds).toEqual({
      capture: MP3,
      'move-self': MP3,
    });
  });
});
