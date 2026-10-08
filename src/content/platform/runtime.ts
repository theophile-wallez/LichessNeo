// The extension APIs the content script uses, in one place.

/** A bundled file's URL, from its path in public/ (`img/…`). */
export const extensionUrl = (path: string): string => chrome.runtime.getURL(path);

/**
 * Whether this content script still belongs to a running extension (not orphaned by a reload).
 * Unit tests run without the extension APIs at all.
 */
export const isConnected = (): boolean =>
  typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;

/** Sends the background worker a message, and its answer, unchecked. */
export const askWorker = (message: unknown): Promise<unknown> =>
  chrome.runtime.sendMessage<unknown, unknown>(message);

/** One of the extension's messages (public/_locales), in the browser's language, `$1`… filled in. */
export const message = (name: string, ...substitutions: string[]): string =>
  chrome.i18n.getMessage(name, substitutions);

/** A value of the browser's synced storage, which follows the user to their other browsers. */
export async function readSynced(key: string): Promise<unknown> {
  const items: Record<string, unknown> = await chrome.storage.sync.get(key);
  return items[key];
}

export const writeSynced = (key: string, value: unknown): Promise<void> =>
  chrome.storage.sync.set({ [key]: value });

/** Calls `listener` with the new value whenever `key` changes, here or in another tab. */
export function onSyncedChange(key: string, listener: (value: unknown) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = changes[key];
    if (area === 'sync' && change) listener(change.newValue);
  });
}
