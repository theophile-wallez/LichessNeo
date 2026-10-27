import { z } from 'zod/mini';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { hasPart, PART_KINDS, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { ACCENT_BOARD, isTheme } from './themes.ts';

// The imported packs, and what each part shows: one of the extension's
// themes, a pack, or Lichess's own. The picks are in localStorage, read at
// once from document_start; the packs come a moment later, from IndexedDB.

/** The pick that leaves a part to Lichess. */
export const LICHESS = 'lichess';

/** The extension's board in the accent; Lichess's pieces and sounds. */
const DEFAULT_PICKS: Readonly<Record<PartKind, string>> = {
  board: ACCENT_BOARD,
  piece: LICHESS,
  sound: LICHESS,
};

export const PICK_KEYS: Readonly<Record<PartKind, string>> = {
  board: StorageKey.board,
  piece: StorageKey.pieces,
  sound: StorageKey.sounds,
};

// A pack's id is a path (source.ts): anything else is a theme, Lichess's, or
// a bundled board or piece set of an older version.
export const isPackId = (pick: string): boolean => pick.includes('/');

// Our blue board became the accent's, which is that blue in the default color theme.
const RENAMED: Readonly<Record<string, string>> = { blue: ACCENT_BOARD };

/** The stored pick, before the packs are read: a pack's id, a theme's or LICHESS. */
export function storedPick(kind: PartKind): string {
  const stored = readStored(PICK_KEYS[kind], z.string());
  if (stored === null) return DEFAULT_PICKS[kind];
  const pick = RENAMED[stored] ?? stored;
  return pick === LICHESS || isTheme(kind, pick) || isPackId(pick) ? pick : DEFAULT_PICKS[kind];
}

const pick = (kind: PartKind, id: string): void => writeStored(PICK_KEYS[kind], id);

/** What a part shows: a pack, one of the extension's themes (its id), or Lichess's (null). */
export type Look = Pack | string | null;

export type Shown = Readonly<Record<PartKind, Look>>;

export interface Library {
  /** The packs read so far: the picked ones, then all once `loadAll` is done. */
  readonly packs: () => readonly Pack[];
  /** Settles once the picked packs are read, or failed to be. */
  readonly ready: Promise<void>;
  /** Reads every stored pack, once, for the lists: again if that failed. */
  readonly loadAll: () => Promise<void>;
  /** Whether the last try at reading them all failed. */
  readonly unreadable: () => boolean;
  /** What the part shows: a pack's id, a theme's, or LICHESS. */
  readonly current: (kind: PartKind) => string;
  readonly choose: (kind: PartKind, id: string) => void;
  /** Shows `id` on the part, unsaved, while its tile is hovered; null shows the pick again. */
  readonly preview: (kind: PartKind, id: string | null) => void;
  /** Stores a pack, replacing one of the same id, and shows each part it has. */
  readonly add: (pack: Pack) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly onChange: (listener: () => void) => void;
  /** Shows the picks again, once any pack they name is read: another tab changed them. */
  readonly refresh: () => Promise<void>;
}

export interface LibraryOptions {
  /** Reads the picked packs as the page starts; the others wait for `loadAll`. */
  readonly readPicked: () => Promise<readonly Pack[]>;
  readonly readAll: () => Promise<readonly Pack[]>;
  readonly save: (pack: Pack) => Promise<void>;
  readonly erase: (id: string) => Promise<void>;
  /** Puts what the parts show on the page. */
  readonly show: (shown: Shown) => void;
}

const lookOfPick = (kind: PartKind, id: string, packs: readonly Pack[]): Look | undefined => {
  if (id === LICHESS) return null;
  if (isTheme(kind, id)) return id;
  return packs.find(pack => pack.id === id && hasPart(pack, kind));
};

/** The part's look, or its default's while its pack is unread, gone or lacks the part. */
function lookOf(kind: PartKind, packs: readonly Pack[]): Look {
  const look = lookOfPick(kind, storedPick(kind), packs);
  // Null is a look too: Lichess's.
  return look === undefined ? (lookOfPick(kind, DEFAULT_PICKS[kind], []) ?? null) : look;
}

const idOf = (look: Look): string => {
  if (look === null) return LICHESS;
  return typeof look === 'string' ? look : look.id;
};

const UNREADABLE = '[LichessNeo] the imported packs could not be read';

/** A tile hovered in the settings, shown on its part a moment. */
interface Preview {
  readonly kind: PartKind;
  readonly id: string;
}

function shownFrom(packs: readonly Pack[], preview: Preview | null): Shown {
  const shown = {
    board: lookOf('board', packs),
    piece: lookOf('piece', packs),
    sound: lookOf('sound', packs),
  };
  const look = preview && lookOfPick(preview.kind, preview.id, packs);
  return preview && look !== undefined ? { ...shown, [preview.kind]: look } : shown;
}

async function readOrNone(read: () => Promise<readonly Pack[]>): Promise<readonly Pack[]> {
  try {
    return await read();
  } catch (error) {
    console.error(UNREADABLE, error);
    return [];
  }
}

/** Shows the parts at once, those whose pack is unread again once it's read. */
export function createLibrary(options: LibraryOptions): Library {
  const { readAll, save, erase, show } = options;
  let list: Pack[] = [];
  let loading: Promise<void> | null = null;
  let failed = false;
  const listeners = new Set<() => void>();
  let preview: Preview | null = null;
  const update = (): void => {
    show(shownFrom(list, preview));
    for (const listener of listeners) listener();
  };
  // The packs already shown keep their objects: a new one would send its sounds again.
  const load = async (): Promise<void> => {
    try {
      const all = await readAll();
      list = all.map(pack => list.find(entry => entry.id === pack.id) ?? pack);
      failed = false;
    } catch (error) {
      console.error(UNREADABLE, error);
      loading = null;
      failed = true;
    }
    update();
  };
  const loadPicked = async (): Promise<void> => {
    const read = await readOrNone(options.readPicked);
    list = [...list, ...read.filter(pack => !list.some(entry => entry.id === pack.id))];
    update();
  };
  update();
  return {
    packs: () => list,
    ready: loadPicked(),
    loadAll: () => (loading ??= load()),
    unreadable: () => failed,
    current: kind => idOf(lookOf(kind, list)),
    choose: (kind, id) => {
      pick(kind, id);
      update();
    },
    preview: (kind, id) => {
      preview = id === null ? null : { kind, id };
      show(shownFrom(list, preview));
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
      for (const kind of PART_KINDS) if (storedPick(kind) === id) pick(kind, DEFAULT_PICKS[kind]);
      update();
    },
    onChange: listener => listeners.add(listener),
    refresh: loadPicked,
  };
}
