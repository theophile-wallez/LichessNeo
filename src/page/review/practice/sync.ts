import { z } from 'zod/mini';
import { type Color, COLORS } from '#shared/chess/types.ts';
import { readStoredJson, removeStored, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { chapterOf, OTHER_CHAPTER, toMinute, treeEntries, withEntries } from './chapters.ts';
import { parsePgn, type PgnTree, writeMovetext } from './pgn-tree.ts';
import {
  type Entry,
  entryKey,
  keepRepertoire,
  mergedEntries,
  storedRepertoire,
} from './repertoire.ts';
import { prunedTree, withoutPruned } from './sync-prune.ts';
import { exportStudy, importChapter, replaceChapter } from './study-api.ts';

// The repertoire's copy in the user's Lichess studies, one per side, so that it
// follows their account: read once a visit and merged with the local copy, each
// position as it was last played; the chapters changed written back once a line
// ends. The local copy stays the one practice reads.

const SyncSchema = z.object({
  /** The private study of each side. */
  studies: z.object({ white: z.string(), black: z.string() }),
  /** The chapters changed since last written, as `side|chapter`. */
  dirty: z.array(z.string()),
  /** The lines the user removed, as `side|moves`, the last move the one removed: gone from the studies too. */
  pruned: z.optional(z.array(z.string())),
});

export type SyncState = z.infer<typeof SyncSchema>;

/** Lichess's limit: past it, a new opening's positions stay in the local copy. */
const MAX_CHAPTERS = 64;

/** A chapter as last read or written: its id, and its tree with the user's own words. */
interface Chapter {
  readonly id: string;
  readonly tree: PgnTree;
}

const chapters = new Map<string, Chapter>();
let pulled = false;
/** A read is on its way, or done: the page asks on each of its renders. */
let started = false;
let queue: Promise<void> = Promise.resolve();
let failed = false;
let busy = false;
let listener: () => void = () => {};

const chapterKey = (side: Color, chapter: string): string => `${side}|${chapter}`;

export function syncState(): SyncState | null {
  try {
    return readStoredJson(StorageKey.practiceSync, SyncSchema);
  } catch {
    return null;
  }
}

export const keepSyncState = (state: SyncState): void =>
  writeStoredJson(StorageKey.practiceSync, state);

/** Where the copy stands, for the page to show. */
export const syncShown = (): { on: boolean; busy: boolean; failed: boolean } => ({
  on: syncState() !== null,
  busy,
  failed,
});

/** What to call when the copy's state, or the repertoire, changes. */
export const onSync = (call: () => void): void => {
  listener = call;
};

/** Stops keeping the copy: the studies stay the user's. */
export function stopSync(): void {
  removeStored(StorageKey.practiceSync);
  chapters.clear();
  pulled = false;
  started = false;
  failed = false;
}

/** One task at a time, each after the last, its failure shown until the next succeeds. */
export function track(task: () => Promise<void>): Promise<void> {
  const run = async (): Promise<void> => {
    busy = true;
    listener();
    try {
      await task();
      failed = false;
    } catch (error) {
      console.warn('[LichessNeo] practice sync failed', error);
      failed = true;
    }
    busy = false;
    listener();
  };
  queue = queue.then(run);
  return queue;
}

/** A task on the copy, while it's on. */
const enqueue = (task: (state: SyncState) => Promise<void>): Promise<void> =>
  track(async () => {
    const state = syncState();
    if (state) await task(state);
  });

const chapterIdOf = (url: string | undefined): string => url?.split('/').at(-1) ?? '';

/** Reads a side's study: its chapters, and the positions they record. */
async function readSide(state: SyncState, side: Color): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (const game of parsePgn(await exportStudy(state.studies[side]))) {
    const name = game.tags.get('ChapterName') ?? '';
    const id = chapterIdOf(game.tags.get('ChapterURL'));
    if (!name || !id) continue;
    chapters.set(chapterKey(side, name), { id, tree: game.tree });
    entries.push(...treeEntries(game.tree, side, name));
  }
  return entries;
}

/** The chapters of the positions the study has older, or not at all: to write. */
function staleChapters(own: readonly Entry[], read: readonly Entry[]): string[] {
  const readAt = new Map(read.map(entry => [entryKey(entry), entry.last]));
  // The study keeps times to the minute.
  return own
    .filter(entry => (readAt.get(entryKey(entry)) ?? -1) < toMinute(entry.last))
    .map(entry => chapterKey(entry.side, chapterOf(entry.name)));
}

async function pull(state: SyncState): Promise<void> {
  const all = (await Promise.all(COLORS.map(side => readSide(state, side)))).flat();
  const read = withoutPruned(state, all);
  const merged = mergedEntries(storedRepertoire(), read);
  keepRepertoire(merged);
  const dirty = new Set([...state.dirty, ...staleChapters(merged, read)]);
  keepSyncState({ ...state, dirty: [...dirty] });
  pulled = true;
  started = true;
}

/** The chapter a new opening goes in: its own while the study has room. */
function roomFor(side: Color, chapter: string): string {
  if (chapters.has(chapterKey(side, chapter))) return chapter;
  const count = [...chapters.keys()].filter(key => key.startsWith(`${side}|`)).length;
  return count < MAX_CHAPTERS - 1 ? chapter : OTHER_CHAPTER;
}

async function writeChapter(state: SyncState, key: string): Promise<boolean> {
  const [side, chapter = ''] = key.split('|');
  if (side !== 'white' && side !== 'black') return false;
  const entries = storedRepertoire().filter(
    entry => entry.side === side && chapterOf(entry.name) === chapter,
  );
  const name = roomFor(side, chapter);
  const kept = chapters.get(chapterKey(side, name));
  const tree = prunedTree(state, side, withEntries(kept?.tree ?? null, entries));
  const pgn = writeMovetext(tree);
  if (kept) {
    await replaceChapter(state.studies[side], kept.id, pgn);
    chapters.set(chapterKey(side, name), { id: kept.id, tree });
    return false;
  }
  await importChapter(state.studies[side], { name, pgn, orientation: side });
  return true;
}

async function push(state: SyncState): Promise<void> {
  let added = false;
  for (const key of state.dirty) {
    added = (await writeChapter(state, key)) || added;
    const now = syncState();
    if (now) keepSyncState({ ...now, dirty: now.dirty.filter(each => each !== key) });
  }
  // A chapter added gets its id from the study, read again.
  if (added) await Promise.all(COLORS.map(side => readSide(state, side)));
  // Every chapter written: the lines removed are gone from the studies.
  const after = syncState();
  if (after && after.dirty.length === 0) keepSyncState({ ...after, pruned: [] });
}

/** Reads the studies, then writes what they lack: within a task. */
export async function syncNow(): Promise<void> {
  const state = syncState();
  if (!state) return;
  await pull(state);
  const now = syncState();
  if (now) await push(now);
}

/** Reads the studies once a visit, then writes what they lack. */
export function startSync(): Promise<void> {
  if (started) return queue;
  started = true;
  return track(syncNow);
}

/** A position of `side` in the opening `name` changed: its chapter is to write. */
export function noteChanged(side: Color, name: string): void {
  const state = syncState();
  const key = chapterKey(side, chapterOf(name));
  if (state && !state.dirty.includes(key))
    keepSyncState({ ...state, dirty: [...state.dirty, key] });
}

/** Lines removed by the user: their chapters are to write without them. */
export function notePruned(side: Color, line: readonly string[], names: readonly string[]): void {
  const state = syncState();
  if (!state) return;
  const keys = names.map(name => chapterKey(side, chapterOf(name)));
  keepSyncState({
    ...state,
    dirty: [...new Set([...state.dirty, ...keys])],
    pruned: [...(state.pruned ?? []), `${side}|${line.join(' ')}`],
  });
}

let pushing = false;

/** Writes the chapters changed: once a line ends, or practice stops. The page asks on each render. */
export function pushSync(): Promise<void> {
  const state = syncState();
  if (pushing || !state || state.dirty.length === 0) return queue;
  pushing = true;
  return enqueue(async current => {
    if (!pulled) await pull(current);
    const now = syncState();
    if (now && now.dirty.length > 0) await push(now);
  }).finally(() => {
    pushing = false;
  });
}
