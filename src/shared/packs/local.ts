import type { PackFolder } from './assemble.ts';
import { readManifest, readPackFile } from './download.ts';
import { PackError, type Read, tooBig } from './github.ts';
import { type LooseDrop, looseFolder } from './loose.ts';
import { folderOf, isVisible } from './loose-names.ts';
import type { Manifest } from './manifest.ts';
import { MANIFEST_FILE } from './source.ts';

// A pack read from the user's own files, dropped or picked: a folder or zip
// with its pack.json, read as one on GitHub is and known by its name, so
// importing it again replaces it; or loose files, whose pack.json is made for
// them (loose.ts) and whose parts are then kept one by one (items.ts).

export interface LocalFile {
  /** Its path among the files dropped, with forward slashes. */
  readonly path: string;
  readonly size: number;
  readonly read: () => Promise<Uint8Array>;
}

const LOCAL = 'local:';

/** The id of the pack of that name. It holds no `#`, which starts an item's id (source.ts). */
export const localSourceId = (name: string): string =>
  `${LOCAL}${name.toLowerCase().replace(/[#/]/g, '-')}/`;

const fileName = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/** Reads the files by their path from `root`, or by their path in the pack.json the files make. */
function localReader(files: readonly LocalFile[], find: (path: string) => string): Read {
  const byPath = new Map(files.map(file => [file.path, file]));
  return async (path, maxBytes) => {
    const file = byPath.get(find(path));
    if (file === undefined) throw new PackError(`${path} is not there.`);
    if (file.size > maxBytes) throw tooBig(file.path, maxBytes);
    return file.read();
  };
}

// Picked rather than dropped, files come with no folder: a path of the
// pack.json then finds its file by name, if no other has it.
function pathFinder(files: readonly LocalFile[], root: string): (path: string) => string {
  const paths = new Set(files.map(file => file.path));
  return path => {
    if (paths.has(root + path) || root !== '') return root + path;
    const named = files.filter(file => fileName(file.path) === fileName(path));
    return named.length === 1 && named[0] ? named[0].path : path;
  };
}

/** The shallowest pack.json among the files, or null. */
export function manifestPath(files: readonly LocalFile[]): string | null {
  const manifests = files
    .map(file => file.path)
    .filter(path => isVisible(path) && fileName(path) === MANIFEST_FILE)
    .toSorted((left, right) => left.split('/').length - right.split('/').length);
  return manifests[0] ?? null;
}

interface Opened {
  readonly read: Read;
  readonly manifest: () => Promise<Manifest>;
  /** A path of the pack.json as the user knows its file. */
  readonly shown: (path: string) => string;
}

/** Where the files were dropped: on a zone, with the name of those not in a folder, or as a pack. */
export type LocalDrop = LooseDrop | { readonly kind: 'pack' };

function open(files: readonly LocalFile[], drop: LocalDrop): Opened {
  const path = manifestPath(files);
  if (path !== null) {
    const read = localReader(files, pathFinder(files, folderOf(path)));
    return { read, manifest: () => readManifest(read), shown: path => path };
  }
  if (drop.kind === 'pack') throw new PackError(`There is no ${MANIFEST_FILE} there.`);
  const loose = looseFolder(
    files.map(file => file.path),
    drop,
  );
  const fileOf = (inManifest: string): string => loose.files.get(inManifest) ?? inManifest;
  return {
    read: localReader(files, fileOf),
    manifest: () => Promise.resolve(loose.manifest),
    shown: fileOf,
  };
}

/** What `run` gives, or the sentence its PackError says. */
async function answer<T>(run: () => Promise<T>): Promise<T | { readonly error: string }> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}

/** The pack the files make: theirs if they hold a pack.json, else one of the zone's kind. */
export function localFolder(dropped: readonly LocalFile[], drop: LocalDrop): PackFolder {
  const files = dropped.filter(file => isVisible(file.path));
  let opened: Opened | null = null;
  const opening = (): Opened => (opened ??= open(files, drop));
  return {
    manifest: () =>
      answer(async () => {
        const manifest = await opening().manifest();
        return { source: localSourceId(manifest.name), manifest };
      }),
    file: (path, kind) =>
      answer(async () => {
        const { read, shown } = opening();
        return { url: await readPackFile(read, path, kind, shown(path)) };
      }),
  };
}
