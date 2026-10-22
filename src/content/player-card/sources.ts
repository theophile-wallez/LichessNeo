import type { RatingHistory } from '#shared/rating-history.ts';
import { topRating } from '#content/sidebar/top-rating.ts';
import {
  cardGames,
  cardHistory,
  cardPerfStat,
  cardUser,
  type CardUser,
  type PerfStat,
  type RecentGame,
} from './api.ts';
import { GAMES_ASKED } from './facts.ts';

// What Lichess has told us about a player, and when to ask for it. Nothing is
// asked until their name is hovered: the profile comes first, the rest only
// once the pointer has stayed on it, as a page of names (a tournament, the
// forum) would otherwise ask hundreds of times over in a few seconds.

const DETAILS_DELAY_MS = 400;

export interface CardSources {
  readonly user: CardUser;
  readonly history?: RatingHistory;
  readonly stat?: PerfStat;
  readonly games?: readonly RecentGame[];
}

/** The sources, with what the card needs to draw them. */
export type CardData = CardSources & {
  /** The player's name, as their profile's address has it. */
  readonly name: string;
  /** Lichess shows them online, so how long ago they were seen needn't be said. */
  readonly online: boolean;
  /** The settings' Chess.com ratings are on. */
  readonly chesscom: boolean;
  readonly now: number;
};

const loaded = new Map<string, CardSources>();
const asked = new Set<string>();

let redraw: () => void = () => {};

/** Called whenever a player's data lands, for the card to draw it. */
export const onCardSources = (listener: () => void): void => {
  redraw = listener;
};

/** What Lichess has said about them so far, without asking it anything. */
export const cardSources = (name: string): CardSources | undefined => loaded.get(name);

function merge(name: string, part: Partial<CardSources>): void {
  const current = loaded.get(name);
  if (!current) return;
  loaded.set(name, { ...current, ...part });
  redraw();
}

async function askHistory(name: string): Promise<void> {
  const history = await cardHistory(name);
  if (history) merge(name, { history });
}

async function askPerfStat(name: string, speed: string): Promise<void> {
  const stat = await cardPerfStat(name, speed);
  if (stat) merge(name, { stat });
}

async function askGames(name: string): Promise<void> {
  const games = await cardGames(name, GAMES_ASKED);
  if (games) merge(name, { games });
}

async function askDetails(name: string, user: CardUser): Promise<void> {
  const speed = topRating(user)?.speed;
  await Promise.all([
    askHistory(name),
    speed === undefined ? null : askPerfStat(name, speed),
    askGames(name),
  ]);
}

interface CardAsk {
  readonly name: string;
  /** Whether the card still shows them, once the pointer has had time to leave. */
  readonly stays: () => boolean;
}

/** Asks Lichess about the player whose name the pointer is on, once per name. */
export function askCard({ name, stays }: CardAsk): void {
  if (asked.has(name)) return;
  asked.add(name);
  void (async () => {
    const user = await cardUser(name);
    // A closed account, or a Lichess that can't answer: worth asking again later.
    if (!user) {
      asked.delete(name);
      return;
    }
    loaded.set(name, { user });
    redraw();
    setTimeout(() => {
      if (stays()) void askDetails(name, user);
      // Hovered in passing: the details wait for a hover that lasts.
      else asked.delete(name);
    }, DETAILS_DELAY_MS);
  })();
}
