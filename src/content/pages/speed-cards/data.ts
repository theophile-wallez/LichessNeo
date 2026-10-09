import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import type { UserSchema } from '#content/sidebar/top-rating.ts';
import { CARD_SPEEDS, poolOfClock, type CardSpeed } from './pools.ts';

// What the home's speed cards show, from Lichess's public API: each speed's
// rating and games (`/api/user/<name>`), its recent ratings
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

export const CardSchema = z.object({
  speed: z.enum(CARD_SPEEDS),
  games: z.number(),
  rating: z.number(),
  provisional: z.boolean(),
  /** The last ratings, oldest first: the card's curve. */
  history: z.array(z.number()),
  /** The pool of the speed's last game, if it was one. */
  last: z.optional(z.string()),
});

export type Card = z.infer<typeof CardSchema>;

/** The pool of each speed's most recent game, from the export's lines, newest first. */
export function lastPools(ndjson: string): Partial<Record<CardSpeed, string>> {
  const last: Partial<Record<CardSpeed, string>> = {};
  for (const line of ndjson.split('\n')) {
    const game = parseJson(line, GameSchema);
    const speed = CARD_SPEEDS.find(candidate => candidate === game?.speed);
    if (!speed || last[speed] || !game?.clock) continue;
    const pool = poolOfClock(game.clock.initial, game.clock.increment);
    if (pool) last[speed] = pool;
  }
  return last;
}

interface CardSources {
  readonly user: z.infer<typeof UserSchema>;
  readonly history: z.infer<typeof HistorySchema>;
  readonly last: Partial<Record<CardSpeed, string>>;
}

/** One card per speed, in the cards' order. */
export function cardsOf({ user, history, last }: CardSources): Card[] {
  return CARD_SPEEDS.map(speed => {
    const perf = user.perfs[speed];
    // Its series are named by their key (`blitz`); Lichess's docs show them capitalized.
    const points = history.find(entry => entry.name.toLowerCase() === speed)?.points ?? [];
    const games = perf?.games ?? 0;
    const rating = perf?.rating ?? START_RATING;
    const card: Card = {
      speed,
      games,
      rating,
      provisional: perf?.prov === true,
      history: curveOf(points, games, rating),
    };
    const pool = last[speed];
    if (pool !== undefined) card.last = pool;
    return card;
  });
}
