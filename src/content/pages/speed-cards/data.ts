import { z } from 'zod/mini';
import { SEEK_PERFS } from '#shared/custom-seek.ts';
import { parseJson } from '#shared/json.ts';
import { curveOf, type HistorySchema, seriesOf, START_RATING } from '#shared/rating-history.ts';
import { CARD_SPEEDS, poolOfClock, type CardSpeed } from './pools.ts';

// What the home's cards show, from Lichess's public API: each rating's
// (a speed's or a variant's) value and games (`/api/user/<name>`), its recent ratings
// (`/api/user/<name>/rating-history`) and the pool of its last game
// (`/api/games/user/<name>`, one game a line).

const GameSchema = z.object({
  speed: z.string(),
  clock: z.optional(z.object({ initial: z.number(), increment: z.number() })),
});

const PerfSchema = z.object({
  games: z.number(),
  rating: z.number(),
  prov: z.optional(z.boolean()),
});

const optionalPerf = z.optional(PerfSchema);

export const CardUserSchema = z.object({
  perfs: z.object({
    ultraBullet: optionalPerf,
    bullet: optionalPerf,
    blitz: optionalPerf,
    rapid: optionalPerf,
    classical: optionalPerf,
    correspondence: optionalPerf,
    chess960: optionalPerf,
    crazyhouse: optionalPerf,
    kingOfTheHill: optionalPerf,
    threeCheck: optionalPerf,
    antichess: optionalPerf,
    atomic: optionalPerf,
    horde: optionalPerf,
    racingKings: optionalPerf,
  }),
});

export const CardSchema = z.object({
  /** The rating: a speed's, or a variant's. */
  perf: z.enum(SEEK_PERFS),
  games: z.number(),
  rating: z.number(),
  provisional: z.boolean(),
  /** The last ratings, oldest first: the card's curve. */
  history: z.array(z.number()),
  /** For a speed, the pool of its last game, if it was one. */
  last: z.optional(z.string()),
});

export type Card = z.infer<typeof CardSchema>;

/** Each game of the export's lines played in a pool, newest first, with its speed. */
function pooledGames(ndjson: string): { readonly speed: CardSpeed; readonly pool: string }[] {
  return ndjson.split('\n').flatMap(line => {
    const game = parseJson(line, GameSchema);
    const speed = CARD_SPEEDS.find(candidate => candidate === game?.speed);
    const pool = game?.clock ? poolOfClock(game.clock.initial, game.clock.increment) : null;
    return speed && pool ? [{ speed, pool }] : [];
  });
}

/** The pool of each speed's most recent game, from the export's lines, newest first. */
export function lastPools(ndjson: string): Partial<Record<CardSpeed, string>> {
  const last: Partial<Record<CardSpeed, string>> = {};
  for (const { speed, pool } of pooledGames(ndjson)) last[speed] ??= pool;
  return last;
}

/** The pool of the most recent game played in one, from the export's lines, newest first. */
export const newestPool = (ndjson: string): string | undefined => pooledGames(ndjson)[0]?.pool;

interface CardSources {
  readonly user: z.infer<typeof CardUserSchema>;
  readonly history: z.infer<typeof HistorySchema>;
  readonly last: Partial<Record<CardSpeed, string>>;
}

const speedOf = (perf: string): CardSpeed | undefined => CARD_SPEEDS.find(speed => speed === perf);

/** The numbers of every rating a card can show, speeds first. */
export function cardsOf({ user, history, last }: CardSources): Card[] {
  return SEEK_PERFS.map(key => {
    const perf = user.perfs[key];
    const points = seriesOf(history, key);
    const games = perf?.games ?? 0;
    const rating = perf?.rating ?? START_RATING;
    const card: Card = {
      perf: key,
      games,
      rating,
      provisional: perf?.prov === true,
      history: curveOf(points, games, rating),
    };
    const speed = speedOf(key);
    const pool = speed && last[speed];
    if (pool) card.last = pool;
    return card;
  });
}
