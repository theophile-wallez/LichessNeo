import { describe, expect, it } from 'vitest';
import {
  baseName,
  fileType,
  folderOf,
  isVisible,
  pieceOfFile,
  soundOfFile,
} from './loose-names.ts';

describe('fileType', () => {
  it('tells images and sounds by their extension, in any case', () => {
    expect(fileType('pieces/wK.SVG')).toBe('image');
    expect(fileType('board.jpeg')).toBe('image');
    expect(fileType('sounds/move.ogg')).toBe('sound');
    expect(fileType('README.md')).toBe('other');
  });
});

describe('baseName and folderOf', () => {
  it('split a path into its folder and its name', () => {
    expect(baseName('set/pieces/wK.png')).toBe('wK');
    expect(folderOf('set/pieces/wK.png')).toBe('set/pieces/');
    expect(folderOf('wK.png')).toBe('');
  });
});

describe('pieceOfFile', () => {
  it("reads Lichess's names, in any case", () => {
    expect(pieceOfFile('wK.png')).toBe('wK');
    expect(pieceOfFile('pieces/bn.svg')).toBe('bN');
  });

  it('reads a side and a role, in either order', () => {
    expect(pieceOfFile('white-king.webp')).toBe('wK');
    expect(pieceOfFile('Black_Pawn.png')).toBe('bP');
    expect(pieceOfFile('queen white.png')).toBe('wQ');
  });

  it("reads Wikimedia Commons' names", () => {
    expect(pieceOfFile('Chess_klt45.svg')).toBe('wK');
    expect(pieceOfFile('Chess_ndt45.svg')).toBe('bN');
  });

  it('finds nothing in other names', () => {
    expect(pieceOfFile('board.png')).toBeNull();
    expect(pieceOfFile('wX.png')).toBeNull();
    expect(pieceOfFile('constructor.png')).toBeNull();
  });
});

describe('soundOfFile', () => {
  it('reads the names of the sounds, in any case or spelling', () => {
    expect(soundOfFile('sounds/move-self.mp3')).toBe('move-self');
    expect(soundOfFile('MoveSelf.wav')).toBe('move-self');
    expect(soundOfFile('Capture.ogg')).toBe('capture');
  });

  it('reads the names other sets give', () => {
    expect(soundOfFile('Move.mp3')).toBe('move-self');
    expect(soundOfFile('LowTime.mp3')).toBe('tenseconds');
    expect(soundOfFile('GenericNotify.ogg')).toBe('notify');
  });

  it('finds nothing in other names', () => {
    expect(soundOfFile('boom.ogg')).toBeNull();
    expect(soundOfFile('constructor.mp3')).toBeNull();
  });
});

describe('isVisible', () => {
  it('leaves out hidden files and what macOS adds to a zip', () => {
    expect(isVisible('pieces/wK.png')).toBe(true);
    expect(isVisible('pieces/.DS_Store')).toBe(false);
    expect(isVisible('__MACOSX/pieces/wK.png')).toBe(false);
  });
});
