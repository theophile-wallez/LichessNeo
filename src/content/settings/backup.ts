import { z } from 'zod/mini';
import { readStored, removeStored, StorageKey, writeStored } from '#shared/storage.ts';
import { extensionVersion, readSynced } from '#content/platform/runtime.ts';
import { readPacks, writePack } from '#content/packs/store.ts';
import { BACKED_UP_KEYS, type Backup, makeBackup } from './backup-file.ts';
import { parseSettings, updateSettings } from './settings.ts';

// Makes a backup of what the extension keeps (backup-file.ts), and puts one
// back. Every place a setting lives is read or written here: the synced
// settings, the page's storage and the packs' database.

/** A backup of everything kept now. Throws if a storage can't be read. */
export async function createBackup(): Promise<Backup> {
  const stored: Backup['stored'] = {};
  for (const key of BACKED_UP_KEYS) {
    const value = readStored(StorageKey[key], z.string());
    if (value !== null) stored[key] = value;
  }
  // Read again rather than taken from memory, which holds the defaults until the storage answers.
  const settings = parseSettings(await readSynced(StorageKey.settings));
  const packs = await readPacks();
  return makeBackup({
    settings,
    stored,
    packs,
    extension: extensionVersion(),
    created: new Date(),
  });
}

/**
 * Replaces the settings and the picks with the backup's, a pick it doesn't have going back to
 * its default. The packs are added to those kept, first, so a failure there changes nothing else.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  for (const pack of backup.packs) await writePack(pack);
  for (const key of BACKED_UP_KEYS) {
    const value = backup.stored[key];
    if (value === undefined) removeStored(StorageKey[key]);
    else writeStored(StorageKey[key], value);
  }
  await updateSettings(() => backup.settings);
}
