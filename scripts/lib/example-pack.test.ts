import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { examplePackZip, EXAMPLE_ZIP } from './example-pack.ts';

describe('packs/warm-wood.zip', () => {
  it('is the example pack as it is now: run `node scripts/example-pack.ts` after changing it', async () => {
    expect(
      Buffer.from(await readFile(EXAMPLE_ZIP)).equals(Buffer.from(await examplePackZip())),
    ).toBe(true);
  });
});
