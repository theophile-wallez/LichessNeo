import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { HistorySchema, type RatingHistory } from '#shared/rating-history.ts';

// What the hover card asks Lichess about the player hovered, from its public
// API, and only once the pointer is on their name. Each answer is kept for the
// tab's life, so hovering the same name again costs nothing. A Lichess that
// rate-limits us (429) or is down stops every request for a while, waiting
// twice as long after each failure in a row.

const FIRST_RETRY_MS = 10_000;
const MAX_RETRY_MS = 300_000;

// The player's own numbers: ratings, record, time played, and who they are.
const PerfSchema = z.object({
  games: z.number(),
  rating: z.number(),
  prov: z.optional(z.boolean()),
  /** The rating's progress over their last dozen games. */
  prog: z.optional(z.number()),
});

const optionalPerf = z.optional(PerfSchema);

// Spelled out rather than a record of the speeds, which would turn down the
// ratings we don't read (puzzles, Storm, the variants).
const PerfsSchema = z.object({
  ultraBullet: optionalPerf,
  bullet: optionalPerf,
  blitz: optionalPerf,
  rapid: optionalPerf,
  classical: optionalPerf,
  correspondence: optionalPerf,
});

const CardUserSchema = z.object({
  perfs: PerfsSchema,
  seenAt: z.optional(z.number()),
  playTime: z.optional(z.object({ total: z.number() })),
  count: z.optional(z.object({ win: z.number(), loss: z.number(), draw: z.number() })),
  profile: z.optional(
    z.object({ fideRating: z.optional(z.number()), location: z.optional(z.string()) }),
  ),
  streaming: z.optional(z.boolean()),
});

export type CardUser = z.infer<typeof CardUserSchema>;

// One rating's stats (`/api/user/<name>/perf/<perf>`): its rank among the
// players of that speed, its record, the best win and the streak running.
const PerfStatSchema = z.object({
  rank: z.optional(z.nullable(z.number())),
  /** How many players they are better than, as a percentage. */
  percentile: z.optional(z.nullable(z.number())),
  stat: z.object({
    highest: z.optional(z.nullable(z.object({ int: z.number() }))),
    bestWins: z.optional(
      z.object({
        results: z.array(
          z.object({
            opRating: z.number(),
            opId: z.object({ name: z.string() }),
            gameId: z.string(),
          }),
        ),
      }),
    ),
    count: z.optional(z.object({ opAvg: z.number() })),
    resultStreak: z.optional(z.object({ win: z.object({ cur: z.object({ v: z.number() }) }) })),
  }),
});

export type PerfStat = z.infer<typeof PerfStatSchema>;

// A game of their last few, for their form. An ongoing one has no winner yet.
const GamePlayerSchema = z.object({ user: z.optional(z.object({ id: z.string() })) });

const RecentGameSchema = z.object({
  id: z.string(),
  status: z.string(),
  winner: z.optional(z.enum(['white', 'black'])),
  players: z.object({ white: GamePlayerSchema, black: GamePlayerSchema }),
});

export type RecentGame = z.infer<typeof RecentGameSchema>;

let blockedUntil = 0;
let retryMs = FIRST_RETRY_MS;

function hold(): void {
  blockedUntil = Date.now() + retryMs;
  retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
}

/** The response, or null when Lichess can't answer (and then holds the others back). */
async function get(url: string, accept: string): Promise<Response | null> {
  if (Date.now() < blockedUntil) return null;
  try {
    const response = await fetch(url, { headers: { Accept: accept } });
    if (response.ok) {
      retryMs = FIRST_RETRY_MS;
      return response;
    }
    // A closed or unknown account won't answer better later; a busy Lichess will.
    if (response.status === 429 || response.status >= 500) hold();
    return null;
  } catch {
    hold();
    return null;
  }
}

async function askJson<T>(url: string, schema: z.ZodMiniType<T>): Promise<T | null> {
  const response = await get(url, 'application/json');
  if (!response) return null;
  const body: unknown = await response.json().catch(() => null);
  return schema.safeParse(body).data ?? null;
}

/** Keeps each name's answer; a failed one is dropped, so a later hover asks again. */
function cached<T>(
  store: Map<string, Promise<T | null>>,
  key: string,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const kept = store.get(key);
  if (kept) return kept;
  const answer = (async () => {
    const value = await load();
    if (value === null) store.delete(key);
    return value;
  })();
  store.set(key, answer);
  return answer;
}

const users = new Map<string, Promise<CardUser | null>>();
const histories = new Map<string, Promise<RatingHistory | null>>();
const perfStats = new Map<string, Promise<PerfStat | null>>();
const recentGames = new Map<string, Promise<RecentGame[] | null>>();

export const cardUser = (name: string): Promise<CardUser | null> =>
  cached(users, name, () => askJson(`/api/user/${encodeURIComponent(name)}`, CardUserSchema));

export const cardHistory = (name: string): Promise<RatingHistory | null> =>
  cached(histories, name, () =>
    askJson(`/api/user/${encodeURIComponent(name)}/rating-history`, HistorySchema),
  );

export const cardPerfStat = (name: string, perf: string): Promise<PerfStat | null> =>
  cached(perfStats, `${name}/${perf}`, () =>
    askJson(`/api/user/${encodeURIComponent(name)}/perf/${perf}`, PerfStatSchema),
  );

/** Their last games, newest first, for the form; one game a line. */
export const cardGames = (name: string, max: number): Promise<RecentGame[] | null> =>
  cached(recentGames, name, async () => {
    const url = `/api/games/user/${encodeURIComponent(name)}?max=${max}&moves=false&tags=false&opening=false&lastFen=false`;
    const response = await get(url, 'application/x-ndjson');
    const lines = (await response?.text().catch(() => null))?.split('\n');
    return lines?.flatMap(line => parseJson(line, RecentGameSchema) ?? []) ?? null;
  });
