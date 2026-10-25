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
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { chesscomShown } from '#shared/chesscom-rating/shown.ts';
import { onOwnName, ownName } from '#shared/own-name.ts';
import { onSettings, type Settings } from '#content/settings/settings.ts';
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
  type TopRating,
} from './top-rating.ts';

// Signed in, the sidebar shows the rating of the player's most played speed
// beside their name, or the one the settings pick, in place of Lichess's
// avatar glyph (styles/sidebar/donate-and-buttons.css). The last ratings are
// kept, with the pick, and put on <html> from document_start, so they're there
// with the sidebar's first frame.
// Lichess is asked again once it's 5 minutes old, and the home page's speed
// cards bring it a fresh one each time they're drawn. With the Chess.com
// ratings on, the pill shows the rating's equivalent, where the speed has one.
// Folded, the sidebar draws the player as their name's initial over the rating,
// the one they picked here if they did (#shared/own-name.ts).

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
let chesscom = false;

function label(rating: TopRating): string {
  const equivalent = chesscom ? chesscomRating(rating.speed, rating.rating) : null;
  return equivalent ? String(equivalent.rating) : ratingLabel(rating.rating, rating.provisional);
}

function show(kept: Kept | null): void {
  shown = kept;
  const rating = kept && pickedRating(kept.top, kept.ratings, pick);
  const root = document.documentElement;
  setData(root, 'lnExtAccountPerf', rating?.speed ?? null);
  const text = rating && label(rating);
  // A CSS string, for the tag's `content`, and its length, which sizes its pill.
  setStyleProperty(root, '--ln-ext-account-rating', text && JSON.stringify(text));
  setStyleProperty(root, '--ln-ext-account-chars', text && String(text.length));
}

// The signed-in user, whose initial the folded sidebar shows.
let account: string | null = null;

function showInitial(): void {
  const name = account && (ownName() ?? account);
  const initial = name && Array.from(name)[0]?.toUpperCase();
  setStyleProperty(
    document.documentElement,
    '--ln-ext-account-initial',
    initial ? JSON.stringify(initial) : null,
  );
}

/** Keeps and shows the ratings of a profile just asked of Lichess. */
export function keepAccountRating(user: string, profile: z.infer<typeof UserSchema>): void {
  const top = topRating(profile);
  if (!top) return;
  const kept = { user, at: Date.now(), top, ratings: ratingsOf(profile) };
  writeStoredJson(StorageKey.accountRating, kept);
  show(kept);
}

function followSettings(settings: Settings): void {
  if (settings.sidebarRating === pick && settings.chesscomRating === chesscom) return;
  pick = settings.sidebarRating;
  chesscom = settings.chesscomRating;
  writeStored(StorageKey.sidebarRating, pick);
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
  account = user ?? null;
  showInitial();
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
    chesscom = chesscomShown();
    const kept = readStoredJson(StorageKey.accountRating, KeptSchema);
    if (kept) show(kept);
    account = kept?.user ?? null;
    showInitial();
    onOwnName(showInitial);
    onDomReady(() => void refresh(kept));
    onSettings(followSettings);
  },
};
