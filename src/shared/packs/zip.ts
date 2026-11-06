import { unzipSync, zipSync, type Zippable } from 'fflate';
import { MAX_FILE_BYTES } from './download.ts';
import { PackError, tooBig } from './github.ts';
import type { LocalFile } from './local.ts';
import { fileType, isVisible } from './loose-names.ts';
import { MANIFEST_FILE } from './source.ts';

// A pack as one zip file, to share: what the settings export, and what can
// be dropped back in, the pack.json at its root or in a folder.

const MAX_ZIP_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 500;

export interface ZipFile {
  readonly path: string;
  readonly data: Uint8Array;
}

/** The files, zipped as they are: images and sounds are compressed already. */
export function createZip(files: readonly ZipFile[]): Blob {
  const entries: Zippable = Object.fromEntries(
    files.map(({ path, data }) => [path, [data, { level: 0 }]]),
  );
  // A copy, on an ArrayBuffer: a Blob takes no view of a shareable one.
  return new Blob([new Uint8Array(zipSync(entries))], { type: 'application/zip' });
}

// A pack.json may name a file of no extension: an exported piece set of mixed types has some.
const isPackFile = (path: string): boolean =>
  fileType(path) !== 'other' || path.split('/').at(-1) === MANIFEST_FILE;

/** The pack's files a zip holds, under their paths in it, in `folder` ('' or ending in a slash). */
export function readZip(bytes: Uint8Array, folder = ''): LocalFile[] {
  if (bytes.length > MAX_ZIP_BYTES) throw tooBig('The zip', MAX_ZIP_BYTES);
  let count = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: ({ name, originalSize }) => {
        if (!isVisible(name) || name.endsWith('/')) return false;
        // Its size is what the zip says: a file that unpacks to more is cut there.
        if (originalSize > MAX_FILE_BYTES) {
          if (isPackFile(name)) throw tooBig(name, MAX_FILE_BYTES);
          return false;
        }
        count += 1;
        if (count > MAX_FILES) throw new PackError(`The zip holds over ${MAX_FILES} files.`);
        return true;
      },
    });
  } catch (error) {
    if (error instanceof PackError) throw error;
    throw new PackError('The zip could not be read.');
  }
  return Object.entries(files).map(([path, data]) => ({
    path: folder + path,
    size: data.length,
    read: () => Promise.resolve(data),
  }));
}
