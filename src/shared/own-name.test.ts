import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanName, keepOwnName, onOwnName, ownName, shownName } from './own-name.ts';
import type * as OwnNameModule from './own-name.ts';
import { StorageKey } from './storage.ts';

// The module keeps the name it read: each of these tests reads the storage afresh.
async function freshModule(): Promise<typeof OwnNameModule> {
  vi.resetModules();
  return import('./own-name.ts');
}

afterEach(() => {
  keepOwnName(null);
  localStorage.clear();
  delete document.body.dataset.user;
});

describe('cleanName', () => {
  it('trims the name as typed', () => {
    expect(cleanName('  Captain Kitty ')).toBe('Captain Kitty');
  });

  it.each([
    ['nothing', '   '],
    ['a name past 30 characters', 'x'.repeat(31)],
    ['a control character', 'Kit\u0007ty'],
  ])('keeps none for %s', (_, text) => {
    expect(cleanName(text)).toBeNull();
  });
});

describe('shownName', () => {
  it('shows the signed-in user their own name, whatever the case Lichess writes', () => {
    document.body.dataset.user = 'eresy';
    keepOwnName('Captain Kitty');
    expect(shownName('Eresy')).toBe('Captain Kitty');
    expect(shownName('eresy', 'GM Eresy')).toBe('Captain Kitty');
  });

  it('leaves other players’ names, and the user’s own without a pick', () => {
    document.body.dataset.user = 'eresy';
    keepOwnName('Captain Kitty');
    expect(shownName('Hikaru')).toBe('Hikaru');
    expect(shownName('hikaru', 'Hikaru')).toBe('Hikaru');
    keepOwnName(null);
    expect(shownName('Eresy')).toBe('Eresy');
  });

  it('leaves the name of a signed-out visitor', () => {
    keepOwnName('Captain Kitty');
    expect(shownName('Eresy')).toBe('Eresy');
  });
});

describe('the kept name', () => {
  it('is kept in the page’s storage, and dropped from it', () => {
    keepOwnName('Captain Kitty');
    expect(localStorage.getItem(StorageKey.name)).toBe('Captain Kitty');
    keepOwnName(null);
    expect(localStorage.getItem(StorageKey.name)).toBeNull();
    expect(ownName()).toBeNull();
  });

  it('is read from the storage, and one it can’t keep is none', async () => {
    localStorage.setItem(StorageKey.name, 'Captain Kitty');
    expect((await freshModule()).ownName()).toBe('Captain Kitty');
    localStorage.setItem(StorageKey.name, 'x'.repeat(31));
    expect((await freshModule()).ownName()).toBeNull();
  });

  it('is none when the storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect((await freshModule()).ownName()).toBeNull();
  });

  it('follows another tab’s name, and tells the listeners', async () => {
    const fresh = await freshModule();
    const heard: (string | null)[] = [];
    fresh.onOwnName(name => heard.push(name));
    localStorage.setItem(StorageKey.coach, '2');
    window.dispatchEvent(new StorageEvent('storage', { key: StorageKey.coach }));
    localStorage.setItem(StorageKey.name, 'Kitty');
    window.dispatchEvent(new StorageEvent('storage', { key: StorageKey.name }));
    expect(fresh.ownName()).toBe('Kitty');
    expect(heard).toEqual(['Kitty']);
  });

  it('tells the listeners of this tab’s name', () => {
    const heard: (string | null)[] = [];
    onOwnName(name => heard.push(name));
    keepOwnName('Kitty');
    keepOwnName(null);
    expect(heard).toEqual(['Kitty', null]);
  });
});
