import { type Import, importPacks } from '#shared/packs/assemble.ts';
import { PackError } from '#shared/packs/github.ts';
import { fileItems, newItemId } from '#shared/packs/items.ts';
import { type LocalDrop, type LocalFile, localFolder, manifestPath } from '#shared/packs/local.ts';
import { withSquareColors } from './board-colors.ts';
import { drawable } from './drawable.ts';
import type { Library } from './library.ts';

// Imports what the user's own files make (shared/packs/local.ts), with the
// same checks as a pack from GitHub: each file must be what its name says and
// draw. A board that names no colors takes its squares'. Loose files make
// items, each stored on its own (shared/packs/items.ts); a pack.json, a pack.

/** What one import stores: a pack.json's packs, or one item, in place of what that source gave. */
export type Imported = Extract<Import, { readonly source: string }>;

export type Imports = { readonly error: string } | { readonly imports: readonly Imported[] };

interface LocalImport {
  /** Reads the files, once they're all in. */
  readonly gather: () => Promise<readonly LocalFile[]>;
  readonly drop: LocalDrop;
  readonly library: Library;
}

async function gathered(gather: LocalImport['gather']): Promise<readonly LocalFile[] | string> {
  try {
    return await gather();
  } catch (error) {
    if (error instanceof PackError) return error.message;
    throw error;
  }
}

/** What the files make, each to store in place of its source's. */
export async function readLocalPacks({ gather, drop, library }: LocalImport): Promise<Imports> {
  const files = await gathered(gather);
  if (typeof files === 'string') return { error: files };
  const imported = await drawable(await importPacks(localFolder(files, drop), ''));
  if ('error' in imported) return imported;
  const packs = await Promise.all(imported.packs.map(withSquareColors));
  if (manifestPath(files) !== null) return { imports: [{ ...imported, packs }] };
  await library.loadAll();
  const items = fileItems(packs, { stored: library.packs(), newId: newItemId });
  return { imports: items.map(item => ({ source: item.id, packs: [item] })) };
}
