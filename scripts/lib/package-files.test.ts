import { describe, expect, it } from 'vitest';
import {
  isPackageName,
  isPackaged,
  listPackageFiles,
  packageName,
  selectSourceFiles,
} from './package-files.ts';
import { tempDirs, writeFiles } from './testing.ts';

const newDir = tempDirs('cdc-package-');

// Each file holds its own name.
async function fixture(files: readonly string[]): Promise<string> {
  const dir = await newDir();
  await writeFiles(dir, Object.fromEntries(files.map(name => [name, name])));
  return dir;
}

describe('packageName', () => {
  it('keeps the names the releases have always had', () => {
    expect(packageName('chrome', '0.1.295')).toBe('LichessReimagined-v0.1.295.zip');
    expect(packageName('chrome-store', '0.1.295')).toBe('LichessReimagined-v0.1.295-store.zip');
    expect(packageName('firefox', '0.1.295')).toBe('LichessReimagined-v0.1.295-firefox.zip');
    expect(packageName('source', '0.1.295')).toBe('LichessReimagined-v0.1.295-source.zip');
  });

  it('recognizes its own names only', () => {
    expect(isPackageName(packageName('firefox', '0.1.3'))).toBe(true);
    expect(isPackageName('LichessReimagined-v0.1.3.zip')).toBe(true);
    expect(isPackageName('notes.zip')).toBe(false);
    expect(isPackageName('LichessReimagined-v0.1.3.zip.part')).toBe(false);
  });
});

describe('isPackaged', () => {
  it('leaves out source maps and desktop litter', () => {
    expect(isPackaged('content.js')).toBe(true);
    expect(isPackaged('content.js.map')).toBe(false);
    expect(isPackaged('img/.DS_Store')).toBe(false);
    expect(isPackaged('.DS_Store')).toBe(false);
    expect(isPackaged('img/Thumbs.db')).toBe(false);
    expect(isPackaged('sitemap.json')).toBe(true);
  });
});

describe('listPackageFiles', () => {
  it('lists every file below the folder, sorted, with forward slashes', async () => {
    const dir = await fixture([
      'manifest.json',
      'content.js',
      'content.js.map',
      'img/icons/trophy.svg',
      'img/coaches/mascot-1.webp',
      'img/.DS_Store',
      '_locales/en/messages.json',
    ]);
    expect(await listPackageFiles(dir)).toEqual([
      '_locales/en/messages.json',
      'content.js',
      'img/coaches/mascot-1.webp',
      'img/icons/trophy.svg',
      'manifest.json',
    ]);
  });
});

describe('selectSourceFiles', () => {
  it('keeps the listed files that exist, once each, sorted', () => {
    const listing = ['src/b.ts', 'README.md', 'src/deleted.ts', 'src/a.ts', 'README.md', ''].join(
      '\0',
    );
    expect(selectSourceFiles(listing, file => file !== 'src/deleted.ts')).toEqual([
      'README.md',
      'src/a.ts',
      'src/b.ts',
    ]);
  });

  it('keeps a path with spaces or newlines whole', () => {
    expect(selectSourceFiles('a b.txt\0c\nd.txt\0', () => true)).toEqual(['a b.txt', 'c\nd.txt']);
  });
});
