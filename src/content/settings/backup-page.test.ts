import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { fakePack, listedPack } from '#shared/testing/packs.ts';
import { readPacks, writePack } from '#content/packs/store.ts';
import { buildBackupPage } from './backup-page.ts';

// IndexedDB isn't in happy-dom: the packs' store is mocked.
vi.mock('#content/packs/store.ts', () => ({
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
}));

const WOOD = fakePack('ann/packs/main/wood/');
const synced = new Map<string, unknown>();
let downloads: { name: string; blob: Blob }[] = [];
let reload: MockInstance<() => void>;

beforeEach(() => {
  synced.clear();
  downloads = [];
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string, values: string[]) => [name, ...values].join(' ') },
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
  const blobs = new Map<string, Blob>();
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    const url = `blob:test/${blobs.size}`;
    if (blob instanceof Blob) blobs.set(url, blob);
    return url;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (blob && this.isConnected) downloads.push({ name: this.download, blob });
  });
  reload = vi.spyOn(location, 'reload').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});

const button = (page: HTMLElement, action: string): HTMLButtonElement | null =>
  queryOne(page, `[data-ln-ext-backup-action='${action}']`, HTMLButtonElement);

const part = (page: HTMLElement, name: string): HTMLElement | null =>
  queryOne(page, `.ln-ext-backup__${name}`, HTMLElement);

/** Picks `text` in the file input, as the user's file dialog does. */
async function pickFile(page: HTMLElement, text: string): Promise<void> {
  const input = queryOne(page, '.ln-ext-backup__file', HTMLInputElement);
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File([text], 'b.json')],
  });
  input?.dispatchEvent(new Event('change'));
  const answered = (): boolean => !part(page, 'confirm')?.hidden || !part(page, 'status')?.hidden;
  await vi.waitFor(() => expect(answered()).toBe(true));
}

/** Exports the settings kept now, and returns the file. */
async function exportFile(page: HTMLElement): Promise<string> {
  button(page, 'export')?.click();
  await vi.waitFor(() => expect(downloads).toHaveLength(1));
  return (await downloads[0]?.blob.text()) ?? '';
}

describe('the settings’ Backup page', () => {
  it('saves the settings to a dated file', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    localStorage.setItem('ln-ext-name', 'Ann');
    const page = buildBackupPage();
    document.body.append(page);
    const text = await exportFile(page);
    vi.useRealTimers();
    expect(downloads[0]?.name).toBe('lichess-neo-settings-2026-10-21.json');
    expect(JSON.parse(text)).toMatchObject({ stored: { name: 'Ann' } });
  });

  it('shows what a file holds, and replaces nothing until asked', async () => {
    synced.set('ln-ext-settings', { gameIntro: 'off' });
    localStorage.setItem('ln-ext-name', 'Ann');
    // Two boards one pack.json lists: the pack is named once.
    const set = 'ann/packs/main/set/';
    vi.mocked(readPacks).mockResolvedValueOnce([
      WOOD,
      listedPack(set, 'board', 'Light'),
      listedPack(set, 'board', 'Dark'),
    ]);
    const page = buildBackupPage();
    document.body.append(page);
    const text = await exportFile(page);
    localStorage.setItem('ln-ext-name', 'Bob');
    await pickFile(page, text);
    expect(part(page, 'summary')?.textContent).toMatch(/backupSummaryPacks Pack \S+, Set$/);
    expect(localStorage.getItem('ln-ext-name')).toBe('Bob');
    button(page, 'cancel')?.click();
    expect(part(page, 'confirm')?.hidden).toBe(true);
    await pickFile(page, text);
    button(page, 'restore')?.click();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(localStorage.getItem('ln-ext-name')).toBe('Ann');
    expect(writePack).toHaveBeenCalledWith(WOOD);
  });

  it('says so of a file that isn’t a backup', async () => {
    const page = buildBackupPage();
    await pickFile(page, '{"name":"Pack"}');
    expect(part(page, 'status')?.textContent).toBe('backupInvalid');
    expect(part(page, 'confirm')?.hidden).toBe(true);
  });

  it('says so if the backup can’t be put back, and doesn’t reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(readPacks).mockResolvedValueOnce([WOOD]);
    vi.mocked(writePack).mockRejectedValueOnce(new Error('quota'));
    const page = buildBackupPage();
    document.body.append(page);
    await pickFile(page, await exportFile(page));
    button(page, 'restore')?.click();
    await vi.waitFor(() => expect(part(page, 'status')?.textContent).toBe('backupRestoreFailed'));
    expect(reload).not.toHaveBeenCalled();
  });
});
