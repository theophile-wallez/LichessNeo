import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { z } from 'zod/mini';
import {
  readStored,
  readStoredJson,
  removeStored,
  SessionKey,
  StorageKey,
  storedKeys,
  writeStored,
  writeStoredJson,
} from './storage.ts';

const AREAS = ['localStorage', 'sessionStorage'];
const originals = new Map(AREAS.map(name => [name, Object.getOwnPropertyDescriptor(window, name)]));

// Chrome blocks site data by throwing from the storage getters themselves.
function blockStorage(): void {
  for (const name of AREAS) {
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  }
}

// happy-dom binds Storage's methods onto each instance the first time they're
// used: a spy on Storage.prototype misses a storage already written to, and
// stays bound to a fresh one after mockRestore. So the full storage is a stand-in.
function fillStorage(): Mock<(key: string, value: string) => void> {
  const setItem = vi.fn<(key: string, value: string) => void>(() => {
    throw new DOMException('full', 'QuotaExceededError');
  });
  const full = { getItem: () => null, setItem, removeItem: () => {} };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => full });
  return setItem;
}

afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(window, name, descriptor);
    else Reflect.deleteProperty(window, name);
  }
  localStorage.clear();
  sessionStorage.clear();
});

describe('storage', () => {
  it('names every key with the ln-ext prefix', () => {
    expect(StorageKey.reviewCache('abcd1234', 80, 3)).toBe('ln-ext-review:abcd1234:80:v3');
    expect(SessionKey.gameStarted('abcd1234')).toBe('ln-ext-started:abcd1234');
    const names = [...Object.values(StorageKey), ...Object.values(SessionKey)].flatMap(key =>
      typeof key === 'string' ? [key] : [],
    );
    for (const name of names) expect(name).toMatch(/^ln-ext-/);
  });

  it('reads back what it wrote, in either area, through a schema', () => {
    writeStored(StorageKey.boardZoom, 80);
    writeStored(SessionKey.lateReload, 5, 'session');
    expect(readStored(StorageKey.boardZoom, z.coerce.number())).toBe(80);
    expect(readStored(SessionKey.lateReload, z.string(), 'session')).toBe('5');
    expect(readStored(SessionKey.lateReload, z.string())).toBeNull();
    removeStored(StorageKey.boardZoom);
    expect(localStorage.getItem(StorageKey.boardZoom)).toBeNull();
  });

  it('reads JSON, and a value that fails its schema as missing', () => {
    writeStoredJson('ln-ext-test', { a: 1 });
    expect(readStoredJson('ln-ext-test', z.object({ a: z.number() }))).toEqual({ a: 1 });
    expect(readStoredJson('ln-ext-test', z.object({ a: z.string() }))).toBeNull();
    localStorage.setItem('ln-ext-test', '{');
    expect(readStoredJson('ln-ext-test', z.unknown())).toBeNull();
  });

  it('loses only the value when the storage is full', () => {
    const setItem = fillStorage();
    expect(() => writeStored(StorageKey.coach, 2)).not.toThrow();
    expect(() => writeStoredJson('ln-ext-test', { a: 1 })).not.toThrow();
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('writes and removes quietly on a blocked storage, but reads throw', () => {
    blockStorage();
    expect(() => writeStored(StorageKey.coach, 2)).not.toThrow();
    expect(() => writeStoredJson('ln-ext-test', { a: 1 }, 'session')).not.toThrow();
    expect(() => removeStored(StorageKey.coach)).not.toThrow();
    expect(storedKeys('ln-ext-')).toEqual([]);
    // Read as missing, a once-per-game check would pass on every load.
    expect(() => readStored(StorageKey.coach, z.string())).toThrow('denied');
    expect(() => readStoredJson('ln-ext-test', z.unknown(), 'session')).toThrow('denied');
  });

  it('lists the keys with a prefix', () => {
    localStorage.clear();
    writeStored('ln-ext-review:a', 1);
    writeStored('ln-ext-review:b', 2);
    writeStored('ln-ext-coach', 3);
    expect(storedKeys('ln-ext-review:').toSorted()).toEqual(['ln-ext-review:a', 'ln-ext-review:b']);
  });
});
