import { describe, expect, it } from 'vitest';
import { apiFileUrl, fileUrl, itemId, packId, parsePackLink, sourceIdOf } from './source.ts';

describe('parsePackLink', () => {
  it.each([
    ['https://github.com/ann/packs', { owner: 'ann', repo: 'packs', ref: 'HEAD', folder: '' }],
    ['https://github.com/ann/packs.git', { owner: 'ann', repo: 'packs', ref: 'HEAD', folder: '' }],
    [
      'https://github.com/ann/packs/tree/main/wood/dark',
      { owner: 'ann', repo: 'packs', ref: 'main', folder: 'wood/dark/' },
    ],
    [
      ' https://github.com/ann/packs/blob/v2/wood/pack.json ',
      { owner: 'ann', repo: 'packs', ref: 'v2', folder: 'wood/' },
    ],
    [
      'https://raw.githubusercontent.com/ann/packs/main/pack.json',
      { owner: 'ann', repo: 'packs', ref: 'main', folder: '' },
    ],
    [
      'https://raw.githubusercontent.com/ann/packs/refs/heads/main/my%20wood/pack.json',
      { owner: 'ann', repo: 'packs', ref: 'refs/heads/main', folder: 'my wood/' },
    ],
  ])('reads %s', (link, source) => {
    expect(parsePackLink(link)).toEqual(source);
  });

  it.each([
    'not a link',
    'http://github.com/ann/packs',
    'https://gitlab.com/ann/packs',
    'https://github.com/ann',
    'https://github.com/ann/packs/issues/3',
    'https://github.com/ann/packs/tree/main/a%5Cb',
    'https://github.com/a%20n/packs',
    'https://github.com/ann/packs/tree/main/%E0%A4%A',
    // An encoded slash, to climb out to another repository or API path.
    'https://github.com/ann/packs/tree/main/x%2F..%2F..%2F..%2F..%2Fmallory%2Fevil%2Fmain',
    'https://github.com/ann/packs/tree/main%2F..%2F..%2Fuser',
    'https://raw.githubusercontent.com/ann/packs/main/a%2F..%2F..%2Fb/pack.json',
    'https://github.com/ann/packs/tree/main%3Fx%23/f',
    // A repository named by dots alone, `..` once `.git` is stripped.
    'https://github.com/ann/...git/tree/main/mallory/evil/contents/p',
    'https://github.com/ann/..git',
  ])('turns down %s', link => {
    expect(parsePackLink(link)).toBeNull();
  });
});

describe('the files', () => {
  const source = { owner: 'Ann', repo: 'Packs', ref: 'main', folder: 'my wood/' };

  it('are read from the raw host, or from the API for a private repository', () => {
    expect(fileUrl(source, 'pieces/wK.svg')).toBe(
      'https://raw.githubusercontent.com/Ann/Packs/main/my%20wood/pieces/wK.svg',
    );
    expect(apiFileUrl(source, 'pack.json')).toBe(
      'https://api.github.com/repos/Ann/Packs/contents/my%20wood/pack.json?ref=main',
    );
    expect(apiFileUrl({ ...source, ref: 'HEAD' }, 'pack.json')).toBe(
      'https://api.github.com/repos/Ann/Packs/contents/my%20wood/pack.json',
    );
  });

  it('name the pack the same whatever the case of its owner and repository', () => {
    expect(packId(source)).toBe('ann/packs/main/my wood/');
    expect(packId({ ...source, owner: 'ANN' })).toBe(packId(source));
    expect(packId({ ...source, folder: 'My wood/' })).not.toBe(packId(source));
  });

  it('tell what pack.json an item came from, and not one of a folder below it', () => {
    const id = itemId(packId(source), 'board', 'Dark #2');
    expect(id).toBe('ann/packs/main/my wood/#board:Dark #2');
    expect(sourceIdOf(id)).toBe(packId(source));
    expect(sourceIdOf(packId(source))).toBe(packId(source));
    expect(sourceIdOf(packId({ ...source, folder: 'my wood/dark/' }))).not.toBe(packId(source));
  });
});
