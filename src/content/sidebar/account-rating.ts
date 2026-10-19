import { z } from 'zod/mini';
import { onDomReady, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import {
  readStored,
  readStoredJson,
  StorageKey,
  writeStored,
  writeStoredJson,
} from '#shared/storage.ts';
import { onSettings } from '#content/settings/settings.ts';
import {
  pickedRating,
  RatingPickSchema,
  ratingLabel,
  RatingsSchema,
  ratingsOf,
  topRating,
  TopRatingSchema,
  UserSchema,
  type RatingPick,
} from './top-rating.ts';

// Signed in, the sidebar shows the rating of the player's most played speed
// beside their name, or the one the settings pick, in place of Lichess's
// avatar glyph (styles/sidebar/donate-and-buttons.css). The last ratings are
// kept, with the pick, and put on <html> from document_start, so they're there
// with the sidebar's first frame.
// Lichess is asked again once it's 5 minutes old, and the home page's speed
// cards bring it a fresh one each time they're drawn.

const MAX_AGE_MS = 5 * 60 * 1000;

// The other speeds came later: a record without them shows the most played one.
const KeptSchema = z.object({
  user: z.string(),
  at: z.number(),
  top: TopRatingSchema,
  ratings: z.optional(RatingsSchema),
});

type Kept = z.infer<typeof KeptSchema>;

let shown: Kept | null = null;
let pick: RatingPick = 'mostPlayed';

function show(kept: Kept | null): void {
  shown = kept;
  const rating = kept && pickedRating(kept.top, kept.ratings, pick);
  const root = document.documentElement;
  setData(root, 'lnExtAccountPerf', rating?.speed ?? null);
  const label = rating && ratingLabel(rating.rating, rating.provisional);
  // A CSS string, for the tag's `content`, and its length, which sizes its pill.
  setStyleProperty(root, '--ln-ext-account-rating', label && JSON.stringify(label));
  setStyleProperty(root, '--ln-ext-account-chars', label && String(label.length));
}

/** Keeps and shows the ratings of a profile just asked of Lichess. */
export function keepAccountRating(user: string, profile: z.infer<typeof UserSchema>): void {
  const top = topRating(profile);
  if (!top) return;
  const kept = { user, at: Date.now(), top, ratings: ratingsOf(profile) };
  writeStoredJson(StorageKey.accountRating, kept);
  show(kept);
}

function followPick(next: RatingPick): void {
  if (next === pick) return;
  pick = next;
  writeStored(StorageKey.sidebarRating, next);
  if (shown) show(shown);
}

/** The player's profile as Lichess has it now; null if it can't say. */
export async function fetchProfile(user: string): Promise<z.infer<typeof UserSchema> | null> {
  const response = await fetch(`/api/user/${encodeURIComponent(user)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const parsed = UserSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

async function refresh(kept: Kept | null): Promise<void> {
  const user = document.body.dataset.user;
  // Signed out, or another account than the one kept.
  if (!user || !document.getElementById('user_tag')) return show(null);
  const mine = kept?.user === user ? kept : null;
  if (!mine) show(null);
  if (mine && Date.now() - mine.at < MAX_AGE_MS) return;
  // Offline, or Lichess busy: the kept rating stays.
  const profile = await fetchProfile(user).catch(() => null);
  if (profile) keepAccountRating(user, profile);
}

export const accountRating: Feature = {
  name: 'account rating',
  start: () => {
    pick = readStored(StorageKey.sidebarRating, RatingPickSchema) ?? 'mostPlayed';
    const kept = readStoredJson(StorageKey.accountRating, KeptSchema);
    if (kept) show(kept);
    onDomReady(() => void refresh(kept));
    onSettings(settings => followPick(settings.sidebarRating));
  },
};
