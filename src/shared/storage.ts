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
  // Where the extension's own sound set puts a move's sound, and the backlit board's
  // settings (content/packs/options.ts).
  soundPlace: prefixed('sound-place'),
  backlitLight: prefixed('backlit-light'),
  backlitReach: prefixed('backlit-reach'),
  backlitWaves: prefixed('backlit-waves'),
  backlitGap: prefixed('backlit-gap'),
  backlitRadius: prefixed('backlit-radius'),
  // The custom board's colors and texture (content/packs/custom-board.ts).
  customBoard: prefixed('custom-board'),
  // The black pieces' color (content/packs/black-pieces.ts).
  blackPieces: prefixed('black-pieces'),
  // The custom boards saved under a name (content/packs/saved-boards.ts).
  savedBoards: prefixed('saved-boards'),
  coach: prefixed('coach'),
  // The home hero's own coach, when it isn't the one above (#shared/coach.ts).
  homeCoach: prefixed('home-coach'),
  // The home hero's greetings still to show (content/pages/greeting-deck.ts).
  homeGreetings: prefixed('home-greetings'),
  // The settings' coach switches, kept here too for the page world, and to be read before the
  // settings are (#shared/coach.ts).
  coachOptions: prefixed('coach-options'),
  // The signed-in user's own avatar, picked in the settings (#shared/own-avatar.ts).
  avatar: prefixed('avatar'),
  // The name the signed-in user sees in place of theirs (#shared/own-name.ts).
  name: prefixed('name'),
  // The home hero coach's last entrance, never played twice running (content/coach/mascot).
  coachEntrance: prefixed('coach-entrance'),
  boardZoom: prefixed('board-zoom'),
  // '1' while the sidebar is folded to its icons (content/sidebar/collapse.ts).
  sidebarCollapsed: prefixed('sidebar-collapsed'),
  // The settings' pick of a sidebar or a header, kept here too to show it from document_start
  // (content/sidebar/navigation.ts).
  navigation: prefixed('navigation'),
  // The unfolded sidebar's open sections, by their places (content/sidebar/sections.ts).
  navigationOpen: prefixed('navigation-open'),
  // The signed-in player's most played speed and its rating, and the others
  // (content/sidebar/account-rating.ts).
  accountRating: prefixed('account-rating'),
  // The settings' pick of the speed the sidebar shows, kept here too to show it from document_start.
  sidebarRating: prefixed('sidebar-rating'),
  // The settings' Chess.com ratings switch, kept here for the page world and document_start.
  chesscomRating: prefixed('chesscom-rating'),
  // The home's speed cards: each speed's rating, curve and last pool (content/pages/speed-cards).
  speedCards: prefixed('speed-cards'),
  ratingChartRange: prefixed('rchart:range'),
  // '1' while the game over's card is folded down to its buttons (page/game-over/card-fold.ts).
  endCardFolded: prefixed('end-card-folded'),
  // The metals the player last saw on their own profile's medals (content/profile).
  medalsSeen: prefixed('medals-seen'),
  reviewCache: (gameId: string, positions: number, version: number): string =>
    `${prefixed('review')}:${gameId}:${positions}:v${version}`,
  reviewProgress: (gameId: string, positions: number, version: number): string =>
    `${prefixed('review-progress')}:${gameId}:${positions}:v${version}`,
  // The threats the coach reads around a game's moves, kept with its records.
  reviewThreats: (gameId: string, positions: number, version: number): string =>
    `${prefixed('review-threats')}:${gameId}:${positions}:v${version}`,
  // How opening practice goes, the positions the user met in it, their days and
  // records, and the studies that keep a copy (page/review/practice/settings.ts,
  // repertoire.ts, progress.ts, sync.ts).
  practiceSettings: prefixed('practice-settings'),
  practiceRepertoire: prefixed('practice-repertoire'),
  practiceProgress: prefixed('practice-progress'),
  practiceSync: prefixed('practice-sync'),
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
  // The OAuth request that creates practice's studies, across Lichess's consent page.
  practiceConnect: prefixed('practice-connect'),
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

/**
 * Calls `listener` each time another tab of the site changes one of `keys` in localStorage, or
 * clears it: a tab never hears its own writes. Returns the function that stops it.
 */
export function onStoredElsewhere(keys: readonly string[], listener: () => void): () => void {
  const watched = new Set(keys);
  const onStorage = (event: StorageEvent): void => {
    // sessionStorage's are heard too, from the tab's frames.
    if (event.storageArea && event.storageArea !== localStorage) return;
    if (event.key === null || watched.has(event.key)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
