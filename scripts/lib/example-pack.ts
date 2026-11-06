import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromRoot } from './paths.ts';
import { createZip } from './zip.ts';

const EXAMPLE = fromRoot('packs/example');
export const EXAMPLE_ZIP = fromRoot('packs/warm-wood.zip');

/** The example pack's zip, the same bytes for the same files. */
export async function examplePackZip(): Promise<Uint8Array> {
  const files = await readdir(EXAMPLE, { recursive: true, withFileTypes: true });
  const entries = await Promise.all(
    files
      .filter(file => file.isFile() && !file.name.endsWith('.md'))
      .map(async file => {
        const full = path.join(file.parentPath, file.name);
        return {
          path: path.relative(EXAMPLE, full).split(path.sep).join('/'),
          data: await readFile(full),
        };
      }),
  );
  return createZip(entries);
}
