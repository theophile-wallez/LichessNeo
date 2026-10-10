import { z } from 'zod/mini';
import { StorageKey } from '#shared/storage.ts';
import { isConnected, onSyncedChange, readSynced, writeSynced } from '#content/platform/runtime.ts';
import { CustomThemeSchema, DEFAULT_THEME, ThemePicksSchema } from '#content/colors/themes.ts';
import { RatingPickSchema } from '#content/sidebar/top-rating.ts';

// The extension's settings (the account page's Lichess Reimagined section),
// kept in chrome.storage.sync so they follow the user to their other
// browsers. Read once, then kept up to date as they change in any tab.

/** chrome.storage.sync keeps 8 KB per item: room for these and the rest. */
export const MAX_CUSTOM_THEMES = 24;

const SettingsSchema = z.object({
  /** The interface's own sounds (content/ui/sounds.ts), not Lichess's nor a pack's. */
  uiSounds: z.prefault(z.boolean(), true),
  /** The speed whose rating the sidebar shows beside the player's name (content/sidebar). */
  sidebarRating: z.catch(RatingPickSchema, 'mostPlayed'),
  /** The color theme of Lichess's light scheme and of its dark one (content/colors). */
  colorThemes: z.prefault(ThemePicksSchema, { light: DEFAULT_THEME, dark: DEFAULT_THEME }),
  /** The themes the user made. Unreadable, they're dropped rather than every setting. */
  customThemes: z.catch(z.array(CustomThemeSchema).check(z.maxLength(MAX_CUSTOM_THEMES)), []),
});

export type Settings = z.infer<typeof SettingsSchema>;

const DEFAULTS: Settings = SettingsSchema.parse({});

/** The stored settings; the defaults for any that's missing or unreadable. */
export function parseSettings(value: unknown): Settings {
  return SettingsSchema.safeParse(value).data ?? DEFAULTS;
}

let current: Settings = DEFAULTS;
let loaded = false;
let read = false;
const listeners = new Set<(settings: Settings) => void>();

function update(next: Settings): void {
  current = next;
  for (const listener of listeners) listener(next);
}

async function readSettings(): Promise<void> {
  let stored = current;
  try {
    stored = parseSettings(await readSynced(StorageKey.settings));
  } catch (error) {
    console.warn('[LichessReimagined] settings unread', error);
  }
  read = true;
  update(stored);
}

// A content script left behind by a reload of the extension can't reach its storage.
function load(): void {
  if (loaded || !isConnected()) return;
  loaded = true;
  void readSettings();
  onSyncedChange(StorageKey.settings, value => update(parseSettings(value)));
}

/** The settings as last read: the defaults until the storage answers. */
export function currentSettings(): Settings {
  load();
  return current;
}

/** Whether the storage has answered (or failed to): until then, the settings are the defaults. */
export function settingsRead(): boolean {
  load();
  return read;
}

/** Calls `listener` with the settings each time they're read or changed. */
export function onSettings(listener: (settings: Settings) => void): void {
  load();
  listeners.add(listener);
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const next = { ...current, [key]: value };
  update(next);
  await writeSynced(StorageKey.settings, next);
}

/** Saves the settings `change` makes of the current ones, several fields at once. */
export async function updateSettings(change: (settings: Settings) => Settings): Promise<void> {
  const next = change(current);
  update(next);
  await writeSynced(StorageKey.settings, next);
}
