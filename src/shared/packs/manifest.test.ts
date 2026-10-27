import { describe, expect, it } from 'vitest';
import { firstIssuePath, ManifestSchema } from './manifest.ts';

describe('ManifestSchema', () => {
  it('reads a pack with every part', () => {
    const manifest = {
      name: 'Warm wood',
      pieces: 'pieces/{piece}.svg',
      board: { image: 'board.svg', light: '#f2e4cc', dark: '#C4936A' },
      sounds: { 'move-self': 'sounds/move.mp3', capture: 'sounds/capture.ogg' },
      author: 'unknown fields are dropped',
    };
    expect(ManifestSchema.parse(manifest)).toEqual({
      name: 'Warm wood',
      pieces: 'pieces/{piece}.svg',
      board: { image: 'board.svg', light: '#f2e4cc', dark: '#C4936A' },
      sounds: { 'move-self': 'sounds/move.mp3', capture: 'sounds/capture.ogg' },
    });
  });

  it('reads a pack with one part', () => {
    expect(ManifestSchema.safeParse({ name: 'Clicks', sounds: { capture: 'c.wav' } }).success).toBe(
      true,
    );
  });

  it('reads lists of boards, piece sets and sound sets, beside a lone part', () => {
    const manifest = {
      name: 'Wood',
      board: [
        { name: 'Light', image: 'light.svg', light: '#f2e4cc', dark: '#c4936a' },
        { name: 'Dark', image: 'dark.png' },
      ],
      pieces: 'pieces/{piece}.svg',
      sounds: [{ name: 'Clicks', files: { capture: 'c.wav' } }],
    };
    expect(ManifestSchema.parse(manifest)).toEqual(manifest);
    expect(firstIssuePath(manifest)).toBeNull();
  });

  it.each([
    [{ name: 'Empty' }, ''],
    [{ name: 'Up', board: [{ name: 'A', image: '../a.png' }] }, 'board.0.image'],
    [{ name: 'Nameless', board: [{ image: 'a.png' }] }, 'board.0.name'],
    [{ name: 'Half', board: [{ name: 'A', image: 'a.png', dark: '#000000' }] }, 'board.0'],
    [
      {
        name: 'Twice',
        pieces: [
          { name: 'A', path: 'a/{piece}.svg' },
          { name: 'A', path: 'b/{piece}.svg' },
        ],
      },
      'pieces',
    ],
    [{ name: 'Token', pieces: [{ name: 'A', path: 'a/wK.svg' }] }, 'pieces.0.path'],
    [{ name: 'None', sounds: [] }, 'sounds'],
    [{ name: 'Mute', sounds: [{ name: 'A', files: {} }] }, 'sounds.0.files'],
    [{ name: '', board: { image: 'b.png' } }, 'name'],
    [{ name: 'x'.repeat(41), board: { image: 'b.png' } }, 'name'],
    [{ name: 'No token', pieces: 'pieces/wK.svg' }, 'pieces'],
    [{ name: 'Up', board: { image: '../board.png' } }, 'board.image'],
    [{ name: 'Root', board: { image: '/board.png' } }, 'board.image'],
    [{ name: 'Query', board: { image: 'board.png?raw=1' } }, 'board.image'],
    [{ name: 'Color', board: { image: 'b.png', light: 'beige', dark: '#000000' } }, 'board.light'],
    [{ name: 'Half', board: { image: 'b.png', light: '#ffffff' } }, 'board'],
    [{ name: 'Typo', sounds: { mvoe: 'm.mp3' } }, 'sounds'],
    // Imported, it would show in no list, and couldn't be removed.
    [{ name: 'Silent', sounds: {} }, 'sounds'],
  ])('turns down %j, at "%s"', (manifest, where) => {
    expect(ManifestSchema.safeParse(manifest).success).toBe(false);
    expect(firstIssuePath(manifest)).toBe(where);
  });
});
