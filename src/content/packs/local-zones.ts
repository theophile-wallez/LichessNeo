import { createElement } from '#shared/dom.ts';
import { groupsFor, wrongFiles } from '#shared/packs/assign.ts';
import { PackError } from '#shared/packs/github.ts';
import { itemFiles } from '#shared/packs/item-files.ts';
import { kindOf } from '#shared/packs/items.ts';
import { type LocalFile, manifestPath } from '#shared/packs/local.ts';
import { type Pack, packTitle, type PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import { boardBody } from './board-body.ts';
import { type DropKind, dropZone, type Gather } from './drop-zone.ts';
import { type DialogBody, openImportDialog } from './import-dialog.ts';
import { importPack, importState, setStatus } from './import-status.ts';
import type { Library } from './library.ts';
import { readLocalPacks } from './local-import.ts';
import { pieceBody } from './piece-body.ts';
import { soundBody } from './sound-body.ts';

// The Packs card's zones for the user's own files. What's dropped on one opens
// the import dialog, once for each item it makes (a folder's pieces or
// sounds, each board), and is imported only once named there; a pack's zip,
// with its pack.json, is imported at once. An item listed on the card opens
// the same dialog to be edited.

const BODIES: Readonly<Record<PartKind, (files: readonly LocalFile[]) => DialogBody>> = {
  piece: pieceBody,
  board: boardBody,
  sound: soundBody,
};

const NOT_OF_KIND: Readonly<Record<PartKind, string>> = {
  piece: 'packsNotImage',
  board: 'packsNotImage',
  sound: 'packsNotSound',
};

interface ItemImport {
  readonly kind: PartKind;
  readonly library: Library;
  /** The id of the item edited, which the files replace. */
  readonly edited?: string;
}

/** Imports the item under its name: what went wrong, or null. */
async function importItem(
  { kind, library, edited }: ItemImport,
  { name, files }: { readonly name: string; readonly files: readonly LocalFile[] },
): Promise<string | null> {
  const read = await readLocalPacks({
    gather: async () => files,
    drop: { kind, name },
    library,
    ...(edited !== undefined && { edited }),
  });
  if ('error' in read) return read.error;
  for (const { packs, source } of read.imports) await library.add(packs, source);
  const first = read.imports[0]?.packs[0];
  const done = edited === undefined ? 'packsImported' : 'packsEdited';
  setStatus(message(done, first ? packTitle(first) : ''), false);
  return null;
}

async function gathered(gather: Gather): Promise<readonly LocalFile[] | null> {
  try {
    return await gather();
  } catch (error) {
    if (!(error instanceof PackError)) throw error;
    setStatus(error.message, true);
    return null;
  }
}

async function openDialogs(kind: PartKind, gather: Gather, library: Library): Promise<void> {
  const files = await gathered(gather);
  if (files === null) return;
  if (manifestPath(files) !== null) {
    await importPack(
      () => readLocalPacks({ gather: async () => files, drop: { kind: 'pack' }, library }),
      library,
    );
    return;
  }
  const groups = files.length === 0 ? [[]] : groupsFor(kind, files);
  const [wrong] = wrongFiles(kind, files);
  if (groups.length === 0 && wrong) {
    setStatus(message(NOT_OF_KIND[kind], wrong.path), true);
    return;
  }
  importState.busy = true;
  try {
    for (const group of groups)
      await openImportDialog({
        kind,
        body: BODIES[kind](group),
        library,
        confirm: (name, named) => importItem({ kind, library }, { name, files: named }),
      });
  } finally {
    importState.busy = false;
  }
}

/** Opens the item in the import dialog, with its files and name, to change them. */
export async function editItem(item: Pack, library: Library): Promise<void> {
  const kind = kindOf(item);
  if (kind === undefined || importState.busy) return;
  importState.busy = true;
  try {
    await openImportDialog({
      kind,
      body: BODIES[kind](itemFiles(item)),
      library,
      editing: item,
      confirm: (name, named) =>
        importItem({ kind, library, edited: item.id }, { name, files: named }),
    });
  } finally {
    importState.busy = false;
  }
}

/** The zone that imports the user's files of that kind, or the pack of a zip. */
export function localZone(kind: DropKind, library: Library): HTMLElement {
  const onFiles = (gather: Gather): void => {
    if (importState.busy) return;
    if (kind === 'pack')
      void importPack(() => readLocalPacks({ gather, drop: { kind }, library }), library);
    else void openDialogs(kind, gather, library);
  };
  return dropZone(kind, onFiles);
}

/** The three zones side by side under a line, then the zip's: the user menu's form, signed out. */
export function localZones(library: Library): HTMLElement[] {
  const zones = createElement('div', { className: 'ln-ext-packs__drops' });
  zones.append(
    localZone('piece', library),
    localZone('board', library),
    localZone('sound', library),
  );
  const or = createElement('p', { className: 'ln-ext-packs__or', text: message('packsOrLocal') });
  return [or, zones, localZone('pack', library)];
}
