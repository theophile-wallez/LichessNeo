import { z } from 'zod/mini';
import { StorageKey } from '#shared/storage.ts';
import { isConnected, onSyncedChange, readSynced, writeSynced } from '#content/platform/runtime.ts';
import { CustomThemeSchema, DEFAULT_THEME, ThemePicksSchema } from '#content/colors/themes.ts';
import { RatingPickSchema } from '#content/sidebar/top-rating.ts';
import { DEFAULT_INTRO, IntroKindSchema } from '#content/game/intro/kinds.ts';
import { CardPicksSchema } from '#content/pages/speed-cards/picks.ts';

// The extension's settings (the account page's Lichess Neo section),
// kept in chrome.storage.sync so they follow the user to their other
// browsers. Read once, then kept up to date as they change in any tab.

/** chrome.storage.sync keeps 8 KB per item: room for these and the rest. */
export const MAX_CUSTOM_THEMES = 24;

/**
 * The nav from 1020px (content/sidebar): a sidebar on the left, one with the open section's
 * pages listed under it, a rail of icons with their labels, or a header across the top.
 */
export const NavigationSchema = z.enum(['sidebar', 'unfolded', 'rail', 'header']);
export const DEFAULT_NAVIGATION = 'rail';

const SettingsFields = z.object({
  /** The interface's own sounds (content/ui/sounds.ts), not Lichess's nor a pack's. */
  uiSounds: z.prefault(z.boolean(), true),
  /** The coaches play as 3D mascots; off, they stay their still images (content/coach). */
  coachMotion: z.prefault(z.boolean(), true),
  /** The coach judging each move on the free analysis board; off, Lichess's own panel shows. */
  analysisCoach: z.prefault(z.boolean(), true),
  /** The coach drawing what it explains on the board (a pawn's square); off, it only says it. */
  coachBoard: z.prefault(z.boolean(), true),
  navigation: z.catch(NavigationSchema, DEFAULT_NAVIGATION),
  /** Whether the user picked the nav in the settings (navigation-row.ts), not just kept the default. */
  navigationPicked: z.prefault(z.boolean(), false),
  /** The speed whose rating the sidebar shows beside the player's name (content/sidebar). */
  sidebarRating: z.catch(RatingPickSchema, 'mostPlayed'),
  /** The home's quick pairing cards, in their order (content/pages/speed-cards). */
  quickPairing: CardPicksSchema,
  /** Every rating shown as on Chess.com, the Experimental page's switch (content/chesscom-ratings). */
  chesscomRating: z.prefault(z.boolean(), false),
  /** Lichess's clock bar, hidden unless picked on Lichess's preferences page (content/clock-bar). */
  clockBar: z.prefault(z.boolean(), false),
  /** What each outcome of a rated game in play does to the ratings (content/game/stakes). */
  ratingStakes: z.prefault(z.boolean(), true),
  /** The players' intro at a game's start, or none (content/game/intro). */
  gameIntro: z.catch(IntroKindSchema, DEFAULT_INTRO),
  /** The color theme of Lichess's light scheme and of its dark one (content/colors). */
  colorThemes: z.prefault(ThemePicksSchema, { light: DEFAULT_THEME, dark: DEFAULT_THEME }),
  /** The themes the user made. Unreadable, they're dropped rather than every setting. */
  customThemes: z.catch(z.array(CustomThemeSchema).check(z.maxLength(MAX_CUSTOM_THEMES)), []),
});

type Fields = z.infer<typeof SettingsFields>;

// Every save stores every setting, so the sidebar, the default before the rail, was kept by
// all who saved anything: unless picked, it reads as today's default.
const withDefaultNavigation = (settings: Fields): Fields =>
  settings.navigationPicked || settings.navigation !== 'sidebar'
    ? settings
    : { ...settings, navigation: DEFAULT_NAVIGATION };

export const SettingsSchema = z.pipe(SettingsFields, z.transform(withDefaultNavigation));

export type Settings = z.infer<typeof SettingsSchema>;

const DEFAULTS: Settings = SettingsSchema.parse({});

/** The stored settings; the defaults for any that's missing or unreadable. */
export function parseSettings(value: unknown): Settings {
  return SettingsSchema.safeParse(value).data ?? DEFAULTS;
}

let current: Settings = DEFAULTS;
let loaded = false;
let read = false;
// Whether the stored settings were read: a write is made of them, never of the defaults.
let readOk = false;
let reading: Promise<boolean> = Promise.resolve(false);
const listeners = new Set<(settings: Settings) => void>();
const readListeners = new Set<() => void>();

function update(next: Settings): void {
  current = next;
  for (const listener of listeners) listener(next);
}

// A failed read leaves the defaults without telling the settings' listeners: what keeps a
// copy of them (the nav's, the coach's) keeps the one it has.
async function readSettings(): Promise<boolean> {
  try {
    update(parseSettings(await readSynced(StorageKey.settings)));
    readOk = true;
    return true;
  } catch (error) {
    console.warn('[LichessNeo] settings unread', error);
    return false;
  } finally {
    read = true;
    for (const listener of readListeners) listener();
  }
}

// A content script left behind by a reload of the extension can't reach its storage.
function load(): void {
  if (loaded || !isConnected()) return;
  loaded = true;
  reading = readSettings();
  onSyncedChange(StorageKey.settings, value => update(parseSettings(value)));
}

/** The settings as last read: the defaults until the storage answers. */
export function currentSettings(): Settings {
  load();
  return current;
}

/**
 * Whether the storage has answered (or failed to, or can't be reached): until then, the
 * settings are the defaults.
 */
export function settingsRead(): boolean {
  load();
  return read || !isConnected();
}

/** Calls `listener` with the settings each time they're read or changed. */
export function onSettings(listener: (settings: Settings) => void): void {
  load();
  listeners.add(listener);
}

/** Calls `listener` once the storage has answered, or failed to. */
export function onSettingsRead(listener: () => void): void {
  load();
  readListeners.add(listener);
}

// Waits for the read, tried again if it failed: callers that wait on the same failed read
// share the one retry, so each change applies over the one before.
async function readBeforeWrite(): Promise<boolean> {
  load();
  const attempt = reading;
  if (await attempt) return true;
  if (reading === attempt && isConnected()) reading = readSettings();
  return reading;
}

/** Saves the settings `change` makes of the current ones, once those are read. */
export async function updateSettings(change: (settings: Settings) => Settings): Promise<void> {
  // Once read, at once: the controls show the change in the same frame.
  if (!readOk && !(await readBeforeWrite())) return;
  const next = SettingsSchema.parse(change(current));
  update(next);
  await writeSynced(StorageKey.settings, next);
}

export const saveSetting = <K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> =>
  updateSettings(settings => ({ ...settings, [key]: value }));
