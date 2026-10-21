import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// The settings' Chess.com ratings switch, kept in localStorage for the page
// world and for the sidebar's first frame, before the settings are read.

/** Whether ratings show as on Chess.com; off until the settings say. */
export function chesscomShown(): boolean {
  try {
    return readStoredJson(StorageKey.chesscomRating, z.boolean()) ?? false;
  } catch {
    return false;
  }
}

export function keepChesscomShown(shown: boolean): void {
  writeStoredJson(StorageKey.chesscomRating, shown);
}
