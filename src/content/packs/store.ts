import { PackSchema, type Pack } from '#shared/packs/pack.ts';
import { prefixed } from '#shared/prefix.ts';

// The imported packs, in an IndexedDB database of the page's origin: they're
// too big for localStorage, and chrome.storage would need a permission. Read
// back through PackSchema, as anything stored may have been changed since.

const DATABASE = prefixed('packs');
const STORE = 'packs';
const VERSION = 1;

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB failed')));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE, VERSION);
  request.addEventListener('upgradeneeded', () => {
    request.result.createObjectStore(STORE, { keyPath: 'id' });
  });
  return promised(request);
}

// Each use opens and closes the database, so no tab holds it open to block an upgrade.
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await promised(run(database.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    database.close();
  }
}

/** The stored pack of that id, if it still reads as one. */
export async function readPack(id: string): Promise<Pack | null> {
  const value: unknown = await withStore('readonly', store => store.get(id));
  const result = PackSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Every stored pack that still reads as one. */
export async function readPacks(): Promise<Pack[]> {
  const values: unknown[] = await withStore('readonly', store => store.getAll());
  return values.flatMap(value => {
    const result = PackSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });
}

/** Stores a pack, replacing the one with its id. */
export async function writePack(pack: Pack): Promise<void> {
  await withStore('readwrite', store => store.put(pack));
}

export async function deletePack(id: string): Promise<void> {
  await withStore('readwrite', store => store.delete(id));
}
