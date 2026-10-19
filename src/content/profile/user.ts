import { z } from 'zod/mini';

// The profile's user from Lichess's public API (`/api/user/<name>`), asked
// once per page, for its medals.

const PerfSchema = z.object({
  games: z.number(),
  rating: z.number(),
  prov: z.optional(z.boolean()),
});

// Storm and Streak keep a best score, not a rating.
const RunsSchema = z.object({ runs: z.number(), score: z.number() });

export const VARIANTS = [
  'chess960',
  'kingOfTheHill',
  'threeCheck',
  'antichess',
  'atomic',
  'horde',
  'racingKings',
  'crazyhouse',
] as const;

const optionalPerf = z.optional(PerfSchema);

const ProfileUserSchema = z.object({
  username: z.string(),
  title: z.optional(z.string()),
  createdAt: z.number(),
  playTime: z.optional(z.object({ total: z.number() })),
  count: z.optional(z.object({ all: z.number(), win: z.number() })),
  perfs: z.object({
    ultraBullet: optionalPerf,
    bullet: optionalPerf,
    blitz: optionalPerf,
    rapid: optionalPerf,
    classical: optionalPerf,
    correspondence: optionalPerf,
    puzzle: optionalPerf,
    chess960: optionalPerf,
    kingOfTheHill: optionalPerf,
    threeCheck: optionalPerf,
    antichess: optionalPerf,
    atomic: optionalPerf,
    horde: optionalPerf,
    racingKings: optionalPerf,
    crazyhouse: optionalPerf,
    storm: z.optional(RunsSchema),
    streak: z.optional(RunsSchema),
  }),
});

export type ProfileUser = z.infer<typeof ProfileUserSchema>;

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

const asked = new Map<string, Promise<ProfileUser | null>>();

/** The user, or null if Lichess can't say (a closed account, offline). Asked once per name. */
export function profileUser(name: string): Promise<ProfileUser | null> {
  const id = name.toLowerCase();
  let answer = asked.get(id);
  if (!answer) {
    answer = getJson(`/api/user/${encodeURIComponent(id)}`)
      .then(json => ProfileUserSchema.safeParse(json).data ?? null)
      .catch(() => null);
    asked.set(id, answer);
  }
  return answer;
}
