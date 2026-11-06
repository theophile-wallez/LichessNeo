import type { LocalFile } from '#shared/packs/local.ts';
import { readZip } from '#shared/packs/zip.ts';

// The files the user drops on the Packs card or picks in its file field, as
// the pack's files (shared/packs/local.ts): a dropped folder with what's in
// it, under their paths, and a zip with what it holds.

const fromFile = (file: File, path: string): LocalFile => ({
  path,
  size: file.size,
  read: async () => new Uint8Array(await file.arrayBuffer()),
});

const entryFile = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

// A folder's reader gives its entries a batch at a time, then none.
async function folderEntries(folder: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = folder.createReader();
  const entries: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

async function entryFiles(entry: FileSystemEntry): Promise<LocalFile[]> {
  const path = entry.fullPath.replace(/^\//, '');
  if (entry instanceof FileSystemFileEntry) return [fromFile(await entryFile(entry), path)];
  if (!(entry instanceof FileSystemDirectoryEntry)) return [];
  const inside = await Promise.all((await folderEntries(entry)).map(entryFiles));
  return inside.flat();
}

const isZip = (file: LocalFile): boolean => /\.zip$/i.test(file.path);

// A zip dropped alone is the pack; beside other files, it's a folder of them.
async function unzipped(files: readonly LocalFile[]): Promise<LocalFile[]> {
  const opened = await Promise.all(
    files.map(async file => {
      if (!isZip(file)) return [file];
      const folder = files.length === 1 ? '' : `${file.path.replace(/\.zip$/i, '')}/`;
      return readZip(await file.read(), folder);
    }),
  );
  return opened.flat();
}

/**
 * What a drop holds. Its entries are taken at once: the browser empties the
 * drop's data once its event is over.
 */
export function droppedFiles(transfer: DataTransfer): Promise<LocalFile[]> {
  const entries = [...transfer.items].flatMap(item => item.webkitGetAsEntry() ?? []);
  return Promise.all(entries.map(entryFiles)).then(files => unzipped(files.flat()));
}

/** What the file field holds. */
export const pickedFiles = (list: readonly File[]): Promise<LocalFile[]> =>
  unzipped(list.map(file => fromFile(file, file.webkitRelativePath || file.name)));
