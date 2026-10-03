import { z } from 'zod/mini';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { hasPart, PART_KINDS, type Pack, type PartKind } from '#shared/packs/pack.ts';

// The imported packs, and which one each part shows: Lichess's own unless a
// pack is picked for it. The picks are in localStorage, read at once from
// document_start; the packs come a moment later, from IndexedDB.

/** The pick that leaves a part to Lichess. */
export const LICHESS = 'lichess';

const PICK_KEYS: Readonly<Record<PartKind, string>> = {
  board: StorageKey.board,
  piece: StorageKey.pieces,
  sound: StorageKey.sounds,
};

// A pack's id is a path (source.ts); anything else stored is a bundled board
// or piece set of an older version.
const isPackId = (pick: string): boolean => pick.includes('/');

/** The stored pick, before the packs are read: a pack's id or LICHESS. */
export function storedPick(kind: PartKind): string {
  const pick = readStored(PICK_KEYS[kind], z.string());
  return pick !== null && isPackId(pick) ? pick : LICHESS;
}

const pick = (kind: PartKind, id: string): void => writeStored(PICK_KEYS[kind], id);

export type Shown = Readonly<Record<PartKind, Pack | null>>;

export interface Library {
  /** The packs read so far: the picked ones, then all once `loadAll` is done. */
  readonly packs: () => readonly Pack[];
  /** Reads every stored pack, once, for the menu's lists: again if that failed. */
  readonly loadAll: () => Promise<void>;
  /** Whether the last try at reading them all failed. */
  readonly unreadable: () => boolean;
  /** The id of the pack the part shows, or LICHESS. */
  readonly current: (kind: PartKind) => string;
  readonly choose: (kind: PartKind, id: string) => void;
  /** Stores a pack, replacing one of the same id, and shows each part it has. */
  readonly add: (pack: Pack) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly onChange: (listener: () => void) => void;
}

export interface LibraryOptions {
  /** The picked packs, read at once; the others wait for `loadAll`. */
  readonly packs: readonly Pack[];
  readonly readAll: () => Promise<readonly Pack[]>;
  readonly save: (pack: Pack) => Promise<void>;
  readonly erase: (id: string) => Promise<void>;
  /** Puts what the parts show on the page. */
  readonly show: (shown: Shown) => void;
}

export function createLibrary({ packs, readAll, save, erase, show }: LibraryOptions): Library {
  let list = [...packs];
  let loading: Promise<void> | null = null;
  let failed = false;
  const listeners: (() => void)[] = [];
  const shownPack = (kind: PartKind): Pack | null => {
    const pick = storedPick(kind);
    return list.find(pack => pack.id === pick && hasPart(pack, kind)) ?? null;
  };
  const update = (): void => {
    show({ board: shownPack('board'), piece: shownPack('piece'), sound: shownPack('sound') });
    for (const listener of listeners) listener();
  };
  update();
  // The packs already shown keep their objects: a new one would send its sounds again.
  const load = async (): Promise<void> => {
    try {
      const all = await readAll();
      list = all.map(pack => list.find(entry => entry.id === pack.id) ?? pack);
      failed = false;
    } catch (error) {
      console.error('[LichessReimagined] the imported packs could not be read', error);
      loading = null;
      failed = true;
    }
    update();
  };
  return {
    packs: () => list,
    loadAll: () => (loading ??= load()),
    unreadable: () => failed,
    current: kind => shownPack(kind)?.id ?? LICHESS,
    choose: (kind, id) => {
      pick(kind, id);
      update();
    },
    add: async pack => {
      await save(pack);
      list = [...list.filter(entry => entry.id !== pack.id), pack];
      for (const kind of PART_KINDS) if (hasPart(pack, kind)) pick(kind, pack.id);
      update();
    },
    remove: async id => {
      await erase(id);
      list = list.filter(pack => pack.id !== id);
      // Else every page would hide the part a moment, waiting for a pack that's gone.
      for (const kind of PART_KINDS) if (storedPick(kind) === id) pick(kind, LICHESS);
      update();
    },
    onChange: listener => {
      listeners.push(listener);
    },
  };
}
