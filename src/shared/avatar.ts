import { COACH_COUNT, ROBOT_COACH } from './coach.ts';

// Lichess has no profile pictures: each user gets one of the coaches on a color,
// picked from their name, so it's the same on every page and every computer.
// The signed-in user may pick their own (own-avatar.ts), which only their
// browser shows. The look of each coach and color is in styles/theme/avatars.css.

export const AVATAR_COLORS = ['blue', 'purple', 'pink', 'red', 'orange', 'green', 'cyan'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

// Where a coach would melt into the color: the orange, gold and yellow ones on
// orange, the green ones on green, the purple ones on purple, and so on.
const CLASHES: Readonly<Partial<Record<number, readonly AvatarColor[]>>> = {
  2: ['orange'],
  3: ['green'],
  4: ['pink', 'red'],
  5: ['green'],
  6: ['orange'],
  7: ['cyan'],
  9: ['red'],
  10: ['orange'],
  12: ['green'],
  13: ['orange'],
  14: ['blue'],
  15: ['purple'],
  16: ['green'],
  17: ['orange'],
  18: ['purple'],
  21: ['purple'],
  23: ['orange'],
  25: ['green', 'cyan'],
  26: ['orange'],
};

export interface Avatar {
  readonly coach: number;
  readonly color: AvatarColor;
}

/** The coaches a name may get: all but the robot, which is the computer's (a user may still
 * pick it for themselves). */
export const AVATAR_COACHES: readonly number[] = Array.from(
  { length: COACH_COUNT },
  (_, i) => i + 1,
).filter(coach => coach !== ROBOT_COACH);

const AVATARS: readonly Avatar[] = AVATAR_COACHES.flatMap(coach =>
  AVATAR_COLORS.filter(color => !CLASHES[coach]?.includes(color)).map(color => ({
    coach,
    color,
  })),
);

const FIRST_AVATAR: Avatar = { coach: 1, color: 'blue' };

/** FNV-1a, then murmur3's finalizer: names one letter apart land far apart. */
export function nameHash(name: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** The avatar of the user `name`. Lichess's names ignore case, and so does this. */
export function avatarOf(name: string): Avatar {
  const id = name.trim().toLowerCase();
  return AVATARS[nameHash(id) % AVATARS.length] ?? FIRST_AVATAR;
}

/** The user a profile link (`/@/<name>`, in an `href` or a `data-href`) points at. */
export function userInHref(href: string | null | undefined): string | undefined {
  return href ? /\/@\/([\w-]+)/.exec(href)?.[1] : undefined;
}
