import { afterEach, describe, expect, it, vi } from 'vitest';
import { avatarOf } from './avatar.ts';
import {
  avatarAttributes,
  isPicture,
  keepOwnAvatar,
  onOwnAvatar,
  type OwnAvatar,
  ownAvatar,
  userAvatar,
} from './own-avatar.ts';
import type * as OwnAvatarModule from './own-avatar.ts';
import { StorageKey } from './storage.ts';
import { IMAGE } from './testing/packs.ts';

const COACH_PICK: OwnAvatar = { kind: 'coach', coach: 8, color: 'pink' };
const PICTURE_PICK: OwnAvatar = { kind: 'picture', picture: IMAGE };

// The module keeps the pick it read: each of these tests reads the storage afresh.
async function freshModule(): Promise<typeof OwnAvatarModule> {
  vi.resetModules();
  return import('./own-avatar.ts');
}

const otherTabKeeps = (key: string, value: string | null): void => {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent('storage', { key }));
};

afterEach(() => {
  keepOwnAvatar(null);
  localStorage.clear();
  delete document.body.dataset.user;
});

describe('isPicture', () => {
  it('takes a base64 data: URL of a WebP, a PNG or a JPEG', () => {
    expect(isPicture('data:image/webp;base64,UklGRg==')).toBe(true);
    expect(isPicture(IMAGE)).toBe(true);
    expect(isPicture('data:image/jpeg;base64,/9j/4A')).toBe(true);
  });

  it.each([
    ['another kind of image', 'data:image/svg+xml;base64,PHN2Zz4='],
    ['a URL that isn’t data:', 'https://example.com/me.png'],
    ['what would close the stylesheet’s url()', 'data:image/png;base64,iVBO) }'],
    ['too long a picture', `data:image/png;base64,${'A'.repeat(400_000)}`],
  ])('refuses %s', (_, url) => {
    expect(isPicture(url)).toBe(false);
  });
});

describe('userAvatar', () => {
  it('gives the signed-in user the coach and color they picked, whatever the name’s case', () => {
    document.body.dataset.user = 'eresy';
    keepOwnAvatar(COACH_PICK);
    expect(userAvatar(' Eresy ')).toEqual({ coach: 8, color: 'pink', picture: false });
  });

  it('keeps their name’s avatar under their picture', () => {
    document.body.dataset.user = 'eresy';
    keepOwnAvatar(PICTURE_PICK);
    expect(userAvatar('Eresy')).toEqual({ ...avatarOf('Eresy'), picture: true });
  });

  it('leaves every other player, and a signed-out visitor, their name’s avatar', () => {
    keepOwnAvatar(COACH_PICK);
    expect(userAvatar('eresy')).toEqual({ ...avatarOf('eresy'), picture: false });
    document.body.dataset.user = 'eresy';
    expect(userAvatar('Hikaru')).toEqual({ ...avatarOf('Hikaru'), picture: false });
  });
});

describe('avatarAttributes', () => {
  it('names the coach and the color', () => {
    expect(avatarAttributes('Hikaru').value).toBe(
      ' data-lr-ext-avatar-coach="2" data-lr-ext-avatar-color="cyan"',
    );
  });

  it('marks the signed-in user’s picture', () => {
    document.body.dataset.user = 'hikaru';
    keepOwnAvatar(PICTURE_PICK);
    expect(avatarAttributes('Hikaru').value).toBe(
      ' data-lr-ext-avatar-coach="2" data-lr-ext-avatar-color="cyan" data-lr-ext-avatar-picture',
    );
  });

  it('is empty without a user', () => {
    expect(avatarAttributes(undefined).value).toBe('');
  });
});

describe('the kept pick', () => {
  it('is kept in the page’s storage, and dropped from it', () => {
    keepOwnAvatar(COACH_PICK);
    expect(JSON.parse(localStorage.getItem(StorageKey.avatar) ?? 'null')).toEqual(COACH_PICK);
    keepOwnAvatar(null);
    expect(localStorage.getItem(StorageKey.avatar)).toBeNull();
    expect(ownAvatar()).toBeNull();
  });

  it('is read from the storage, and a pick it can’t keep is none', async () => {
    localStorage.setItem(StorageKey.avatar, JSON.stringify(PICTURE_PICK));
    expect((await freshModule()).ownAvatar()).toEqual(PICTURE_PICK);
    localStorage.setItem(StorageKey.avatar, JSON.stringify({ kind: 'coach', coach: 9 }));
    expect((await freshModule()).ownAvatar()).toBeNull();
  });

  it('is none when the storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect((await freshModule()).ownAvatar()).toBeNull();
  });

  it('follows another tab’s pick, and tells the listeners', async () => {
    const { onOwnAvatar: onFresh, ownAvatar: freshAvatar } = await freshModule();
    const heard: (OwnAvatar | null)[] = [];
    onFresh(avatar => heard.push(avatar));
    otherTabKeeps(StorageKey.coach, '3');
    otherTabKeeps(StorageKey.avatar, JSON.stringify(COACH_PICK));
    expect(freshAvatar()).toEqual(COACH_PICK);
    otherTabKeeps(StorageKey.avatar, null);
    expect(freshAvatar()).toBeNull();
    expect(heard).toEqual([COACH_PICK, null]);
  });

  it('tells the listeners of this tab’s pick', () => {
    const heard: (OwnAvatar | null)[] = [];
    onOwnAvatar(avatar => heard.push(avatar));
    keepOwnAvatar(PICTURE_PICK);
    expect(heard).toEqual([PICTURE_PICK]);
  });
});
