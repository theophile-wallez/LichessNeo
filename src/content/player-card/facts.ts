import { curveOf, seriesOf, type RatingHistory } from '#shared/rating-history.ts';
import { topRating, type Speed } from '#content/sidebar/top-rating.ts';
import type { CardUser, RecentGame } from './api.ts';

// What the hover card's numbers mean, apart from the markup that shows them:
// the rating it leads with, how a record splits, how long ago the player was
// seen, and how their last games went.

export interface Headline {
  readonly speed: Speed;
  readonly rating: number;
  readonly provisional: boolean;
  /** The rating's progress over their last dozen games, left out when flat. */
  readonly progress?: number;
  /** The ratings of their last month, oldest first: the sparkline. */
  readonly curve: readonly number[];
}

/** The rating the card leads with: their most played speed's; null before any game. */
export function headlineOf(user: CardUser, history: RatingHistory | undefined): Headline | null {
  const top = topRating(user);
  if (!top) return null;
  const perf = user.perfs[top.speed];
  const games = perf?.games ?? 0;
  const progress = perf?.prog ?? 0;
  // Lichess answers some players with no history at all: no curve then, rather
  // than the rise from 1500 a single point would draw.
  const points = history ? seriesOf(history, top.speed) : [];
  return {
    speed: top.speed,
    rating: top.rating,
    provisional: top.provisional,
    ...(progress !== 0 && { progress }),
    curve: points.length === 0 ? [] : curveOf(points, games, top.rating),
  };
}

export interface Tally {
  readonly win: number;
  readonly draw: number;
  readonly loss: number;
  readonly total: number;
}

/** Their games won, drawn and lost, and how many that is; null before any game. */
export function tallyOf(user: CardUser): Tally | null {
  const count = user.count;
  if (!count) return null;
  const total = count.win + count.draw + count.loss;
  return total === 0 ? null : { ...count, total };
}

/** A share of the tally, as a whole percentage. */
export const shareOf = (part: number, total: number): number => Math.round((part / total) * 100);

interface SinceUnit {
  readonly ms: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

const MINUTE: SinceUnit = { ms: 60_000, unit: 'minute' };

const SINCE_UNITS: readonly SinceUnit[] = [
  MINUTE,
  { ms: 3_600_000, unit: 'hour' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 2_592_000_000, unit: 'month' },
  { ms: 31_536_000_000, unit: 'year' },
];

export interface Since {
  /** Negative, as a relative time in the past. */
  readonly value: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

/** How long ago they were last seen, in the largest unit that counts at least one. */
export function seenSince(seenAt: number, now: number): Since {
  const elapsed = Math.max(now - seenAt, 0);
  let chosen = MINUTE;
  for (const candidate of SINCE_UNITS) if (elapsed >= candidate.ms) chosen = candidate;
  return { value: -Math.max(1, Math.floor(elapsed / chosen.ms)), unit: chosen.unit };
}

export interface Played {
  readonly value: number;
  readonly unit: 'hour' | 'minute';
}

/** How long they've played, in hours, or in minutes under an hour; null below a minute. */
export function playedTime(seconds: number): Played | null {
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return { value: hours, unit: 'hour' };
  const minutes = Math.floor(seconds / 60);
  return minutes >= 1 ? { value: minutes, unit: 'minute' } : null;
}

export type GameResult = 'win' | 'draw' | 'loss';

export interface FormGame {
  readonly result: GameResult;
  readonly gameId: string;
}

/** How many of their last games the form shows. */
export const FORM_GAMES = 5;

/** One more is asked for, so a game still being played doesn't cost a dot. */
export const GAMES_ASKED = FORM_GAMES + 1;

// A game Lichess hasn't finished yet has no result to show.
const ONGOING = new Set(['created', 'started']);

function sideOf(game: RecentGame, user: string): 'white' | 'black' | null {
  if (game.players.white.user?.id === user) return 'white';
  return game.players.black.user?.id === user ? 'black' : null;
}

function resultOf(game: RecentGame, user: string): GameResult | null {
  if (ONGOING.has(game.status)) return null;
  const side = sideOf(game, user);
  if (!side) return null;
  if (game.winner === undefined) return 'draw';
  return game.winner === side ? 'win' : 'loss';
}

/** How their last `max` finished games went, the newest first. */
export function formOf(
  games: readonly RecentGame[],
  name: string,
  max: number,
): readonly FormGame[] {
  const user = name.toLowerCase();
  const form: FormGame[] = [];
  for (const game of games) {
    const result = resultOf(game, user);
    if (result) form.push({ result, gameId: game.id });
    if (form.length === max) break;
  }
  return form;
}
