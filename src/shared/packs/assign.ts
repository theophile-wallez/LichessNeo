import type { SoundName } from '#shared/sounds.ts';
import { fileType, folderOf, pieceOfFile, soundOfFile } from './loose-names.ts';
import type { PartKind, PieceName } from './pack.ts';

// What the import dialog starts from: the files dropped on a zone, sorted
// into the items they make (a piece set or a sound set for each folder, a
// board for each image), each file put in its slot when its name says which,
// and left aside for the user to place otherwise.

export interface Assigned<Slot extends string, File> {
  readonly slots: ReadonlyMap<Slot, File>;
  /** The files whose name says no slot, or one taken by a file before them. */
  readonly loose: readonly File[];
}

interface Named {
  readonly path: string;
}

/** Each file in the slot its name says, the first of two for one slot. */
export function assign<Slot extends string, File extends Named>(
  files: readonly File[],
  slotOf: (path: string) => Slot | null,
): Assigned<Slot, File> {
  const slots = new Map<Slot, File>();
  const loose: File[] = [];
  for (const file of files) {
    const slot = slotOf(file.path);
    if (slot === null || slots.has(slot)) loose.push(file);
    else slots.set(slot, file);
  }
  return { slots, loose };
}

export const assignPieces = <File extends Named>(
  files: readonly File[],
): Assigned<PieceName, File> => assign<PieceName, File>(files, pieceOfFile);

export const assignSounds = <File extends Named>(
  files: readonly File[],
): Assigned<SoundName, File> => assign<SoundName, File>(files, soundOfFile);

const KINDS: Readonly<Record<PartKind, 'image' | 'sound'>> = {
  board: 'image',
  piece: 'image',
  sound: 'sound',
};

/** The files a zone takes, in one group for each item: a folder's, or a board's own. */
export function groupsFor<File extends Named>(kind: PartKind, files: readonly File[]): File[][] {
  const fitting = files.filter(file => fileType(file.path) === KINDS[kind]);
  if (kind === 'board') return fitting.map(file => [file]);
  const folders = new Map<string, File[]>();
  for (const file of fitting) {
    const folder = folders.get(folderOf(file.path)) ?? [];
    folders.set(folderOf(file.path), [...folder, file]);
  }
  return [...folders.values()];
}

/** The files of the other kind: a sound dropped on the pieces, an image on the sounds. */
export const wrongFiles = <File extends Named>(kind: PartKind, files: readonly File[]): File[] =>
  files.filter(file => {
    const type = fileType(file.path);
    return type !== 'other' && type !== KINDS[kind];
  });
