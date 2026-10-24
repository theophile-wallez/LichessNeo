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
// forum) would otherwise ask hundreds of times over in a few seconds. What is
// still on its way is known, so the card can keep its room meanwhile.

const DETAILS_DELAY_MS = 400;

/** A detail asked for once the profile is in. */
export type Detail = 'history' | 'stat' | 'games';

export interface CardSources {
  readonly user: CardUser;
  readonly history?: RatingHistory;
  readonly stat?: PerfStat;
  readonly games?: readonly RecentGame[];
  /** The details not answered yet, nor given up on. */
  readonly pending: readonly Detail[];
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
/** The names whose profile is on its way. */
const awaited = new Set<string>();

let redraw: () => void = () => {};

/** Called whenever a player's data lands, for the card to draw it. */
export const onCardSources = (listener: () => void): void => {
  redraw = listener;
};

/** What Lichess has said about them so far, without asking it anything. */
export const cardSources = (name: string): CardSources | undefined => loaded.get(name);

/** Whether their profile has been asked for and hasn't come back yet. */
export const cardAwaited = (name: string): boolean => awaited.has(name);

/** Takes a detail off the pending ones, with what Lichess said, if it said anything. */
function settle(name: string, detail: Detail, part: Partial<CardSources>): void {
  const current = loaded.get(name);
  if (!current) return;
  loaded.set(name, {
    ...current,
    ...part,
    pending: current.pending.filter(other => other !== detail),
  });
  redraw();
}

async function askHistory(name: string): Promise<void> {
  const history = await cardHistory(name);
  settle(name, 'history', history ? { history } : {});
}

async function askPerfStat(name: string, speed: string): Promise<void> {
  const stat = await cardPerfStat(name, speed);
  settle(name, 'stat', stat ? { stat } : {});
}

async function askGames(name: string): Promise<void> {
  const games = await cardGames(name, GAMES_ASKED);
  settle(name, 'games', games ? { games } : {});
}

async function askDetails(name: string, user: CardUser): Promise<void> {
  const speed = topRating(user)?.speed;
  await Promise.all([
    askHistory(name),
    speed === undefined ? null : askPerfStat(name, speed),
    askGames(name),
  ]);
}

/** The details a profile calls for: a player who never played has no rating to ask about. */
const detailsOf = (user: CardUser): Detail[] =>
  topRating(user) ? ['history', 'stat', 'games'] : ['history', 'games'];

interface CardAsk {
  readonly name: string;
  /** Whether the card still shows them, once the pointer has had time to leave. */
  readonly stays: () => boolean;
}

/** Asks Lichess about the player whose name the pointer is on, once per name. */
export function askCard({ name, stays }: CardAsk): void {
  if (asked.has(name)) return;
  asked.add(name);
  if (!loaded.has(name)) awaited.add(name);
  void (async () => {
    const user = await cardUser(name);
    awaited.delete(name);
    // A closed account, or a Lichess that can't answer: worth asking again later.
    if (!user) {
      asked.delete(name);
      redraw();
      return;
    }
    // Pending from now: if the hover doesn't last, the card is hidden before they'd be asked.
    loaded.set(name, { user, pending: detailsOf(user) });
    redraw();
    setTimeout(() => {
      if (stays()) void askDetails(name, user);
      // Hovered in passing: the details wait for a hover that lasts.
      else asked.delete(name);
    }, DETAILS_DELAY_MS);
  })();
}
