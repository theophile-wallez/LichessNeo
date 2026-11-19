import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromRoot } from './paths.ts';
import { createZip } from './zip.ts';

const EXAMPLE = fromRoot('packs/example');
export const EXAMPLE_ZIP = fromRoot('packs/warm-wood.zip');

/** The example pack's zip (or `folder`'s), the same bytes for the same files. */
export async function examplePackZip(folder = EXAMPLE): Promise<Uint8Array> {
  const files = await readdir(folder, { recursive: true, withFileTypes: true });
  const entries = await Promise.all(
    files
      // A dotfile is the system's (macOS's .DS_Store), not the pack's.
      .filter(file => file.isFile() && !file.name.startsWith('.') && !file.name.endsWith('.md'))
      .map(async file => {
        const full = path.join(file.parentPath, file.name);
        return {
          path: path.relative(folder, full).split(path.sep).join('/'),
          data: await readFile(full),
        };
      }),
  );
  return createZip(entries);
}
