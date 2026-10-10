import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { markCardsStale } from '#content/pages/speed-cards/store.ts';
import { fetchProfile, keepAccountRating } from '#content/sidebar/account-rating.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { finishedGame } from './move-times.ts';

// A game the player just finished changes their rating: the sidebar's is asked
// for again, and the home's speed cards on the next visit.

// Players only: a spectator's follow-up has no rematch button.
const PLAYER_FOLLOW_UP = 'main.round .rcontrols .follow-up .rematch';

let refreshedFor: string | null = null;

/** Refreshes the kept ratings once per finished game the player played. */
export async function refreshAfterGame(): Promise<void> {
  const game = finishedGame();
  // The sync loop starts at document_start, before <body> is parsed.
  const user = document.body?.dataset.user;
  if (!game || !user || game.id === refreshedFor) return;
  if (!queryOne(document, PLAYER_FOLLOW_UP, HTMLElement)) return;
  refreshedFor = game.id;
  markCardsStale();
  // Offline, or Lichess busy: the kept rating stays until it's due again.
  const profile = await fetchProfile(user).catch(() => null);
  if (profile) keepAccountRating(user, profile);
}

export const ratingRefresh: Feature = {
  name: 'rating refresh',
  start: () => onEveryTick('rating refresh', () => void refreshAfterGame()),
};
