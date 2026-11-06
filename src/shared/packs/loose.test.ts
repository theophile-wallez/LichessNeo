import { describe, expect, it } from 'vitest';
import { PIECE_NAMES } from './pack.ts';
import { looseFolder } from './loose.ts';

const pieces = (folder: string, extension = 'png'): string[] =>
  PIECE_NAMES.map(piece => `${folder}${piece}.${extension}`);

describe('looseFolder', () => {
  it('makes a piece set of the twelve pieces, under the name given', () => {
    const { manifest, files } = looseFolder(pieces(''), { kind: 'piece', name: ' Mochi ' });
    expect(manifest.name).toBe('Mochi');
    expect(manifest.pieces).toEqual([{ name: 'Mochi', path: 'pieces/0/{piece}' }]);
    expect(files.get('pieces/0/wK')).toBe('wK.png');
  });

  it('makes a piece set of each folder, named after it', () => {
    const { manifest } = looseFolder([...pieces('set/Dark/'), ...pieces('set/Light/', 'svg')], {
      kind: 'piece',
      name: 'Mine',
    });
    expect(Array.isArray(manifest.pieces) && manifest.pieces.map(set => set.name)).toEqual([
      'Dark',
      'Light',
    ]);
  });

  it('names the pieces a set lacks', () => {
    expect(() => looseFolder(pieces('').slice(1), { kind: 'piece', name: 'Mochi' })).toThrow(
      'The pieces lack wK.',
    );
  });

  it('makes a board of each image, the second named apart', () => {
    const { manifest } = looseFolder(['maple.png', 'mint.webp'], { kind: 'board', name: 'Wood' });
    expect(Array.isArray(manifest.board) && manifest.board.map(board => board.name)).toEqual([
      'Wood',
      'Wood 2',
    ]);
  });

  it('makes a sound set of the sounds named after what they play', () => {
    const { manifest, files } = looseFolder(['Move.mp3', 'capture.ogg', 'readme.txt'], {
      kind: 'sound',
      name: 'Clicks',
    });
    expect(manifest.sounds).toEqual([
      {
        name: 'Clicks',
        files: { 'move-self': 'sounds/0/move-self', capture: 'sounds/0/capture' },
      },
    ]);
    expect(files.get('sounds/0/move-self')).toBe('Move.mp3');
  });

  it('refuses files of the other kind, or named for nothing', () => {
    expect(() => looseFolder(['move.mp3'], { kind: 'piece', name: 'A' })).toThrow(
      'move.mp3 is a sound',
    );
    expect(() => looseFolder(['wK.png'], { kind: 'sound', name: 'A' })).toThrow(
      'wK.png is not a sound',
    );
    expect(() => looseFolder(['boom.ogg'], { kind: 'sound', name: 'A' })).toThrow(
      'name a sound after what it plays',
    );
    expect(() => looseFolder(['wK.png', 'white-king.svg'], { kind: 'piece', name: 'A' })).toThrow(
      'are both wK',
    );
  });

  it('says what a zone found nothing of', () => {
    expect(() => looseFolder(['readme.txt'], { kind: 'board', name: 'A' })).toThrow(
      'There is no image there.',
    );
  });
});
