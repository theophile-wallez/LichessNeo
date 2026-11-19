import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { examplePackZip, EXAMPLE_ZIP } from './example-pack.ts';

describe('packs/warm-wood.zip', () => {
  it('is the example pack as it is now: run `node scripts/example-pack.ts` after changing it', async () => {
    expect(
      Buffer.from(await readFile(EXAMPLE_ZIP)).equals(Buffer.from(await examplePackZip())),
    ).toBe(true);
  });

  it("leaves out the system's dotfiles, as macOS's .DS_Store", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'ln-ext-pack-'));
    try {
      await writeFile(path.join(folder, 'pack.json'), '{}');
      const clean = await examplePackZip(folder);
      await writeFile(path.join(folder, '.DS_Store'), 'Finder');
      expect(Buffer.from(await examplePackZip(folder)).equals(Buffer.from(clean))).toBe(true);
    } finally {
      await rm(folder, { recursive: true });
    }
  });
});
