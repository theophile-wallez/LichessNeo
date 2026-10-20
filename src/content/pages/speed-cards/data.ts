import { z } from 'zod/mini';
import { SEEK_PERFS } from '#shared/custom-seek.ts';
import { parseJson } from '#shared/json.ts';
import { CARD_SPEEDS, poolOfClock, type CardSpeed } from './pools.ts';

// What the home's cards show, from Lichess's public API: each rating's
// (a speed's or a variant's) value and games (`/api/user/<name>`), its recent ratings
// (`/api/user/<name>/rating-history`) and the pool of its last game
// (`/api/games/user/<name>`, one game a line).

export const HistorySchema = z.array(
  z.object({
    name: z.string(),
    points: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])),
  }),
);

const CURVE_POINTS = 30;

// Every rating starts there (Glicko-2's default, as Lichess has it).
const START_RATING = 1500;

/**
 * The curve's ratings, oldest first. Lichess keeps one a day, its last: a speed's first day
 * draws from where every rating starts, and the current rating ends the curve even before the
 * day's point is written.
 */
type HistoryPoint = z.infer<typeof HistorySchema>[number]['points'][number];

function curveOf(points: readonly HistoryPoint[], games: number, rating: number): number[] {
  if (games === 0) return [];
  const ratings = points.slice(-CURVE_POINTS).map(point => point[3]);
  if (ratings.at(-1) !== rating) ratings.push(rating);
  if (ratings.length === 1 && points.length <= 1) ratings.unshift(START_RATING);
  return ratings.slice(-CURVE_POINTS);
}

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
    // Its series are named by their key (`blitz`); Lichess's docs show them capitalized.
    const points =
      history.find(entry => entry.name.toLowerCase() === key.toLowerCase())?.points ?? [];
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
