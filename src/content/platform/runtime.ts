import { isFrench } from '#shared/lang.ts';
import { bundledMessage } from './messages.ts';

// The extension APIs the content script uses, in one place.

/** A bundled file's URL, from its path in public/ (`img/…`). */
export const extensionUrl = (path: string): string => chrome.runtime.getURL(path);

/**
 * Whether this content script still belongs to a running extension (not orphaned by a reload).
 * Unit tests run without the extension APIs at all.
 */
export const isConnected = (): boolean =>
  typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;

/** The extension's version, as its manifest gives it. */
export const extensionVersion = (): string => chrome.runtime.getManifest().version;

/** Sends the background worker a message, and its answer, unchecked. */
export const askWorker = (message: unknown): Promise<unknown> =>
  chrome.runtime.sendMessage<unknown, unknown>(message);

// chrome.i18n speaks the browser's language, which may not be Lichess's (an English
// Chrome on a French Lichess): the page world's review follows Lichess's, and so do these.
const browserFrench = (): boolean => chrome.i18n.getMessage('messagesLanguage', []) === 'fr';

/** One of the extension's messages (public/_locales), in the page's language, `$1`… filled in. */
export function message(name: string, ...substitutions: string[]): string {
  const french = isFrench();
  if (french === browserFrench()) return chrome.i18n.getMessage(name, substitutions);
  return bundledMessage(french ? 'fr' : 'en', name, substitutions);
}

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
