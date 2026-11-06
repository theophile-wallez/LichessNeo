import { describe, expect, it } from 'vitest';
import { fakePack, IMAGE, SOUND } from '#shared/testing/packs.ts';
import { dataUrlBytes } from './sniff.ts';
import { itemFiles } from './item-files.ts';

describe('itemFiles', () => {
  it('names a board after its slot, with its type’s extension', async () => {
    const [board, ...rest] = itemFiles(fakePack('file:1/', ['board']));
    expect(rest).toEqual([]);
    expect(board?.path).toBe('board.png');
    expect(await board?.read()).toEqual(new Uint8Array(dataUrlBytes(IMAGE)));
  });

  it('names each piece and each sound after its own', () => {
    const pieces = itemFiles(fakePack('file:1/', ['piece'])).map(file => file.path);
    expect(pieces).toEqual(
      ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].map(
        name => `${name}.svg`,
      ),
    );
    const sounds = { ...fakePack('file:2/', ['sound']), sounds: { capture: SOUND, castle: SOUND } };
    expect(itemFiles(sounds).map(file => [file.path, file.size])).toEqual([
      ['capture.mp3', 3],
      ['castle.mp3', 3],
    ]);
  });
});
