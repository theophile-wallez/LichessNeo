import { z } from 'zod/mini';
import { AVATAR_COLORS, type Avatar, avatarOf } from './avatar.ts';
import { CoachIdSchema } from './coach.ts';
import { html, type SafeHtml } from './html.ts';
import {
  onStoredElsewhere,
  readStoredJson,
  removeStored,
  StorageKey,
  writeStoredJson,
} from './storage.ts';

// The signed-in user's own avatar, picked in the settings: a coach on a color,
// or a picture of theirs. It's kept in the page's storage, which both worlds
// read from document_start. Only this browser shows it: other players' browsers
// can't know of it, and keep the avatar of the user's name.

/** A picture's side, in pixels: the profile's avatar at twice the pixels. */
export const PICTURE_SIZE = 192;
// The data: URL a picture of that size comes to, with room to spare.
const MAX_PICTURE_LENGTH = 400_000;

// Base64 only: the URL goes into a stylesheet unquoted, as `url()` takes it.
const PictureSchema = z
  .string()
  .check(
    z.maxLength(MAX_PICTURE_LENGTH),
    z.regex(/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/),
  );

/** Whether `url` is a picture the avatar can keep: a data: URL of an image, in base64, not too long. */
export const isPicture = (url: string): boolean => PictureSchema.safeParse(url).success;

export const OwnAvatarSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('coach'), coach: CoachIdSchema, color: z.enum(AVATAR_COLORS) }),
  z.object({ kind: z.literal('picture'), picture: PictureSchema }),
]);

export type OwnAvatar = z.infer<typeof OwnAvatarSchema>;

/** The avatar an element shows: a coach on a color, or over them the user's picture. */
export interface ShownAvatar extends Avatar {
  readonly picture: boolean;
}

let cached: { readonly avatar: OwnAvatar | null } | null = null;
const listeners = new Set<(avatar: OwnAvatar | null) => void>();

function readOwn(): OwnAvatar | null {
  try {
    return readStoredJson(StorageKey.avatar, OwnAvatarSchema);
  } catch {
    // A blocked storage: the avatar of the name.
    return null;
  }
}

/** The user's pick, read once, then again as another tab changes it. */
export function ownAvatar(): OwnAvatar | null {
  if (cached) return cached.avatar;
  cached = { avatar: readOwn() };
  onStoredElsewhere([StorageKey.avatar], () => {
    cached = { avatar: readOwn() };
    for (const listener of listeners) listener(cached.avatar);
  });
  return cached.avatar;
}

/** Keeps `avatar` for every page, or goes back to the name's for null. */
export function keepOwnAvatar(avatar: OwnAvatar | null): void {
  if (avatar) writeStoredJson(StorageKey.avatar, avatar);
  else removeStored(StorageKey.avatar);
  cached = { avatar };
  for (const listener of listeners) listener(avatar);
}

/** Calls `listener` with the pick each time it changes, in this tab or another. */
export function onOwnAvatar(listener: (avatar: OwnAvatar | null) => void): void {
  ownAvatar();
  listeners.add(listener);
}

/** Whether `name` is the signed-in user's, whom Lichess names on <body> by id. */
export const isSignedInUser = (name: string): boolean =>
  document.body?.dataset.user === name.trim().toLowerCase();

/** The avatar of the user `name`: theirs if they picked one here, else their name's. */
export function userAvatar(name: string): ShownAvatar {
  const named = avatarOf(name);
  const own = isSignedInUser(name) ? ownAvatar() : null;
  if (own?.kind === 'coach') return { coach: own.coach, color: own.color, picture: false };
  return { ...named, picture: own?.kind === 'picture' };
}

/** The attributes that give an element (and its `::before`) the avatar of `user`. */
export function avatarAttributes(user: string | undefined): SafeHtml {
  if (user === undefined) return html``;
  const { coach, color, picture } = userAvatar(user);
  return picture
    ? html` data-ln-ext-avatar-coach="${coach}" data-ln-ext-avatar-color="${color}" data-ln-ext-avatar-picture`
    : html` data-ln-ext-avatar-coach="${coach}" data-ln-ext-avatar-color="${color}"`;
}
