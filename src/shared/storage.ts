import type { z } from 'zod/mini';
import { parseJson } from './json.ts';
import { prefixed } from './prefix.ts';

// Everything we keep in the page's storage, prefixed (prefix.ts) so it can't
// clash with Lichess's own keys.
export const StorageKey = {
  // Which imported pack each part shows (content/packs).
  board: prefixed('board'),
  pieces: prefixed('pieces'),
  sounds: prefixed('sounds'),
  coach: prefixed('coach'),
  // The home hero coach's last entrance, never played twice running (content/coach/mascot).
  coachEntrance: prefixed('coach-entrance'),
  boardZoom: prefixed('board-zoom'),
  // '1' while the sidebar is folded to its icons (content/sidebar/collapse.ts).
  sidebarCollapsed: prefixed('sidebar-collapsed'),
  // The signed-in player's most played speed and its rating, and the others
  // (content/sidebar/account-rating.ts).
  accountRating: prefixed('account-rating'),
  // The settings' pick of the speed the sidebar shows, kept here too to show it from document_start.
  sidebarRating: prefixed('sidebar-rating'),
  // The home's speed cards: each speed's rating, curve and last pool (content/pages/speed-cards).
  speedCards: prefixed('speed-cards'),
  ratingChartRange: prefixed('rchart:range'),
  reviewCache: (gameId: string, positions: number, version: number): string =>
    `${prefixed('review')}:${gameId}:${positions}:v${version}`,
  reviewProgress: (gameId: string, positions: number, version: number): string =>
    `${prefixed('review-progress')}:${gameId}:${positions}:v${version}`,
  // The review caches, least recently opened first.
  reviewIndex: prefixed('review-index'),
  // The extension's settings, in chrome.storage.sync rather than the page's (content/settings).
  settings: prefixed('settings'),
  // The picked color themes' palettes, kept here too to be drawn from document_start (content/colors).
  palettes: prefixed('palettes'),
} satisfies Record<string, string | ((...args: never[]) => string)>;

export const SessionKey = {
  lateReload: prefixed('late-reload'),
  gameStarted: (gameId: string): string => `${prefixed('started')}:${gameId}`,
  gameIntro: (gameId: string): string => `${prefixed('intro')}:${gameId}`,
} satisfies Record<string, string | ((...args: never[]) => string)>;

type Area = 'local' | 'session';

const area = (name: Area): Storage => (name === 'local' ? localStorage : sessionStorage);

/**
 * The stored value if it passes `schema`, else null. A blocked storage throws,
 * as it did in the original: since its writes are lost too, reading it as
 * missing would make a once-per-game check pass on every load. So read before
 * changing the page.
 */
export function readStored<T>(
  key: string,
  schema: z.ZodMiniType<T>,
  from: Area = 'local',
): T | null {
  const result = schema.safeParse(area(from).getItem(key));
  return result.success ? result.data : null;
}

/** Like `readStored`, for a JSON value: a blocked storage throws too. */
export function readStoredJson<T>(
  key: string,
  schema: z.ZodMiniType<T>,
  from: Area = 'local',
): T | null {
  return parseJson(area(from).getItem(key), schema);
}

/** Stores a value. A full or blocked storage loses the value without throwing. */
export function writeStored(key: string, value: string | number, to: Area = 'local'): void {
  try {
    area(to).setItem(key, String(value));
  } catch {
    // Quota exceeded, or storage disabled.
  }
}

export function writeStoredJson(key: string, value: unknown, to: Area = 'local'): void {
  writeStored(key, JSON.stringify(value), to);
}

/** Removes a value. As with a write, a blocked storage doesn't throw. */
export function removeStored(key: string, from: Area = 'local'): void {
  try {
    area(from).removeItem(key);
  } catch {
    // Storage disabled.
  }
}

/** The stored keys that start with `prefix`; none when the storage is blocked. */
export function storedKeys(prefix: string, from: Area = 'local'): string[] {
  try {
    const storage = area(from);
    return Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '').filter(key =>
      key.startsWith(prefix),
    );
  } catch {
    return [];
  }
}
