import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pack } from '#shared/packs/pack.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { readPacks, writePack } from '#content/packs/store.ts';
import { createBackup, restoreBackup } from './backup.ts';
import { parseSettings } from './settings.ts';

// IndexedDB isn't in happy-dom: the packs' store is mocked.
vi.mock('#content/packs/store.ts', () => ({
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
}));

const WOOD = fakePack('ann/packs/main/wood/');
const synced = new Map<string, unknown>();

beforeEach(() => {
  synced.clear();
  localStorage.clear();
  vi.mocked(writePack).mockClear();
  vi.stubGlobal('chrome', {
    runtime: { id: 'test', getManifest: () => ({ version: '2.4.12' }) },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
});

describe('the settings’ backup', () => {
  it('holds the synced settings, the picks and the packs, not the caches', async () => {
    synced.set('ln-ext-settings', { gameIntro: 'off' });
    localStorage.setItem('ln-ext-board', WOOD.id);
    localStorage.setItem('ln-ext-custom-board', '{"light":"#eeeeee"}');
    localStorage.setItem('ln-ext-review-index', '[]');
    vi.mocked(readPacks).mockResolvedValueOnce([WOOD]);
    const backup = await createBackup();
    expect(backup.settings).toEqual({ ...parseSettings({}), gameIntro: 'off' });
    expect(backup.stored).toEqual({ board: WOOD.id, customBoard: '{"light":"#eeeeee"}' });
    expect(backup.packs).toEqual([WOOD]);
    expect(backup.extension).toBe('2.4.12');
  });

  it('puts every pick back, and a pick the file hasn’t back to its default', async () => {
    localStorage.setItem('ln-ext-name', 'Ann');
    localStorage.setItem('ln-ext-review-index', '[]');
    synced.set('ln-ext-settings', { uiSounds: false });
    const backup = await createBackup();
    localStorage.clear();
    synced.clear();
    localStorage.setItem('ln-ext-board', 'other');
    localStorage.setItem('ln-ext-review-index', '[1]');
    await restoreBackup({ ...backup, packs: [WOOD] });
    expect(localStorage.getItem('ln-ext-name')).toBe('Ann');
    expect(localStorage.getItem('ln-ext-board')).toBeNull();
    expect(localStorage.getItem('ln-ext-review-index')).toBe('[1]');
    expect(synced.get('ln-ext-settings')).toEqual({ ...parseSettings({}), uiSounds: false });
    expect(writePack).toHaveBeenCalledWith(WOOD);
  });

  it('changes nothing if a pack can’t be kept', async () => {
    localStorage.setItem('ln-ext-board', 'other');
    const backup = await createBackup();
    vi.mocked(writePack).mockRejectedValueOnce(new Error('quota'));
    await expect(restoreBackup({ ...backup, stored: {}, packs: [WOOD] })).rejects.toThrow('quota');
    expect(localStorage.getItem('ln-ext-board')).toBe('other');
    expect(synced.has('ln-ext-settings')).toBe(false);
  });
});
