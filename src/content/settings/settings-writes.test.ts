import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';

// chrome.storage.sync, its reads answered or failed only when the test says so.
const synced = new Map<string, unknown>();
let reads: { resolve: () => void; reject: (error: Error) => void }[] = [];

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('chrome', {
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) =>
          new Promise((resolve, reject) =>
            reads.push({ resolve: () => resolve({ [key]: synced.get(key) }), reject }),
          ),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
});

afterEach(() => {
  synced.clear();
  reads = [];
});

const settingsModule = () => import('./settings.ts');
const stored = (): unknown => synced.get('ln-ext-settings');

/** Answers the oldest read waiting, or fails it. */
async function answer(failed = false): Promise<void> {
  const read = reads.shift();
  if (failed) read?.reject(new Error('blocked'));
  else read?.resolve();
  await flush();
}

describe('the settings’ writes', () => {
  it('wait for the stored settings, and change them rather than the defaults', async () => {
    synced.set('ln-ext-settings', { uiSounds: false, gameIntro: 'salute' });
    const { saveSetting, currentSettings } = await settingsModule();
    currentSettings();
    const saved = saveSetting('coachBoard', false);
    await flush();
    expect(stored()).toEqual({ uiSounds: false, gameIntro: 'salute' });
    await answer();
    await saved;
    expect(stored()).toMatchObject({ uiSounds: false, gameIntro: 'salute', coachBoard: false });
  });

  it('apply each over the one before, when several wait for the read', async () => {
    synced.set('ln-ext-settings', { gameIntro: 'salute' });
    const { saveSetting } = await settingsModule();
    const first = saveSetting('uiSounds', false);
    const second = saveSetting('coachBoard', false);
    await answer();
    await Promise.all([first, second]);
    expect(stored()).toMatchObject({ gameIntro: 'salute', uiSounds: false, coachBoard: false });
  });

  it('try the read again after it failed, and write nothing if that fails too', async () => {
    synced.set('ln-ext-settings', { gameIntro: 'salute' });
    const { saveSetting, currentSettings } = await settingsModule();
    currentSettings();
    await answer(true);
    const saved = saveSetting('uiSounds', false);
    await flush();
    expect(reads).toHaveLength(1);
    await answer(true);
    await saved;
    expect(stored()).toEqual({ gameIntro: 'salute' });
    expect(currentSettings().uiSounds).toBe(true);

    const again = saveSetting('uiSounds', false);
    await flush();
    await answer();
    await again;
    expect(stored()).toMatchObject({ gameIntro: 'salute', uiSounds: false });
  });

  it('leave the listeners alone on a failed read, but say the storage answered', async () => {
    const { onSettings, onSettingsRead, settingsRead } = await settingsModule();
    const changes = vi.fn<() => void>();
    const answered = vi.fn<() => void>();
    onSettings(changes);
    onSettingsRead(answered);
    expect(settingsRead()).toBe(false);
    await answer(true);
    expect(settingsRead()).toBe(true);
    expect(answered).toHaveBeenCalledOnce();
    expect(changes).not.toHaveBeenCalled();
  });

  it('keep a sidebar the user picked, and read one they didn’t as the rail', async () => {
    synced.set('ln-ext-settings', { navigation: 'sidebar', uiSounds: false });
    const { currentSettings, updateSettings } = await settingsModule();
    currentSettings();
    await answer();
    expect(currentSettings().navigation).toBe('rail');
    await updateSettings(settings => ({
      ...settings,
      navigation: 'sidebar',
      navigationPicked: true,
    }));
    expect(stored()).toMatchObject({ navigation: 'sidebar', navigationPicked: true });
    expect(currentSettings().navigation).toBe('sidebar');
  });
});
