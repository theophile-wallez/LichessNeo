import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { replaceDir } from './replace-dir.ts';
import { tempDirs, writeFiles } from './testing.ts';

const newDir = tempDirs('ln-ext-replace-');

/** A parent folder holding `out` with an earlier build in it. */
async function earlierBuild(): Promise<{ parent: string; out: string }> {
  const parent = await newDir();
  const out = path.join(parent, 'out');
  await writeFiles(out, { 'manifest.json': 'old', 'img/old.webp': 'old' });
  return { parent, out };
}

describe('replaceDir', () => {
  it('swaps the new files in whole, and leaves nothing beside the folder', async () => {
    const { parent, out } = await earlierBuild();
    await replaceDir(out, staging => writeFiles(staging, { 'manifest.json': 'new' }));
    expect(await readdir(out, { recursive: true })).toEqual(['manifest.json']);
    expect(await readFile(path.join(out, 'manifest.json'), 'utf8')).toBe('new');
    expect(await readdir(parent)).toEqual(['out']);
  });

  it('keeps the earlier build in place while the new one is written', async () => {
    const { out } = await earlierBuild();
    let seen = '';
    await replaceDir(out, async staging => {
      await writeFile(path.join(staging, 'manifest.json'), 'new');
      seen = await readFile(path.join(out, 'manifest.json'), 'utf8');
    });
    expect(seen).toBe('old');
  });

  it('leaves the earlier build untouched when the new one fails', async () => {
    const { parent, out } = await earlierBuild();
    const failing = replaceDir(out, async staging => {
      await writeFile(path.join(staging, 'content.js'), 'half');
      throw new Error('syntax error');
    });
    await expect(failing).rejects.toThrow('syntax error');
    expect((await readdir(out, { recursive: true })).toSorted()).toEqual([
      'img',
      'img/old.webp',
      'manifest.json',
    ]);
    expect(await readdir(parent)).toEqual(['out']);
  });

  it('creates the folder, and its parents, on a first build', async () => {
    const out = path.join(await newDir(), 'dist', 'chrome');
    await replaceDir(out, staging => writeFiles(staging, { 'manifest.json': 'new' }));
    expect(await readdir(out)).toEqual(['manifest.json']);
  });

  it('starts clean after a run that was cut short', async () => {
    const { out } = await earlierBuild();
    await writeFiles(`${out}.next`, { 'stale.js': 'stale' });
    await replaceDir(out, staging => writeFiles(staging, { 'manifest.json': 'new' }));
    expect(await readdir(out)).toEqual(['manifest.json']);
  });
});
