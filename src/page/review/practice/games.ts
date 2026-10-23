import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { playLine } from '#shared/chess/san.ts';
import type { Color } from '#shared/chess/types.ts';
import type { Explorer } from '#page/lichess/explorer.ts';
import { bookPosition, rateMove, shareOf } from './book.ts';
import { mastersAfter } from './explorer-lookup.ts';
import { entryAt, nameAlong } from './repertoire.ts';

// The user's recent games, read for the openings they keep getting wrong: the
// positions they reached in several, where their usual move isn't their
// repertoire's, or is one the masters hardly play. Each is a drill: the
// position, their habit, and the moves to find instead.

const GameSchema = z.object({
  variant: z.string(),
  moves: z.string(),
  players: z.object({
    white: z.object({ user: z.optional(z.object({ id: z.string() })) }),
    black: z.object({ user: z.optional(z.object({ id: z.string() })) }),
  }),
  opening: z.optional(z.object({ name: z.string(), ply: z.number() })),
});

type Game = z.infer<typeof GameSchema>;

export interface GameDrill {
  readonly side: Color;
  /** The moves to the position, in SAN. */
  readonly moves: readonly string[];
  /** The user's usual move there, in how many of the games that reached it. */
  readonly habit: string;
  readonly times: number;
  readonly games: number;
  /** The moves to play instead: their repertoire's, or the masters' most played. */
  readonly better: readonly string[];
  readonly name: string;
  /** Whether the habit leaves their repertoire, or the masters' book. */
  readonly why: 'repertoire' | 'book';
}

/** The games read: a few weeks' for most players. */
const GAMES = 50;
/** How deep in a game its opening is read, in plies. */
const OPENING_PLIES = 16;
/** A position reached in fewer games isn't a habit. */
const MIN_GAMES = 2;
/** Positions looked up in the masters' games, the most reached first. */
const LOOKUPS = 12;
/** A move this share of the masters' games plays is a fine one: a sideline, not a slip. */
const FINE_SHARE = 0.03;
/** The drills offered at most. */
const DRILLS = 8;

interface Seen {
  readonly side: Color;
  readonly moves: readonly string[];
  readonly name: string;
  games: number;
  readonly played: Map<string, number>;
}

export async function fetchGames(user: string): Promise<Game[]> {
  const query = new URLSearchParams({
    max: String(GAMES),
    rated: 'true',
    perfType: 'blitz,rapid,classical',
    moves: 'true',
    opening: 'true',
    clocks: 'false',
    evals: 'false',
  });
  const response = await fetch(`/api/games/user/${encodeURIComponent(user)}?${query.toString()}`, {
    headers: { Accept: 'application/x-ndjson' },
  });
  if (!response.ok) throw new Error(`Games: ${response.status}`);
  return (await response.text()).split('\n').flatMap(line => parseJson(line, GameSchema) ?? []);
}

function sideOf(game: Game, user: string): Color | null {
  if (game.players.white.user?.id === user) return 'white';
  return game.players.black.user?.id === user ? 'black' : null;
}

/** The positions the user moved from in their games' openings, by side and moves. */
export function seenPositions(games: readonly Game[], user: string): Seen[] {
  const seen = new Map<string, Seen>();
  for (const game of games) {
    if (game.variant !== 'standard') continue;
    const side = sideOf(game, user);
    if (!side) continue;
    const moves = game.moves.split(' ').slice(0, OPENING_PLIES);
    for (let ply = side === 'white' ? 0 : 1; ply < moves.length; ply += 2) {
      const before = moves.slice(0, ply);
      const key = `${side}|${before.join(' ')}`;
      const position = seen.get(key) ?? {
        side,
        moves: before,
        // The game's opening, named where it was reached by then.
        name: (game.opening?.ply ?? Infinity) <= ply ? (game.opening?.name ?? '') : '',
        games: 0,
        played: new Map<string, number>(),
      };
      position.games++;
      const san = moves[ply] ?? '';
      position.played.set(san, (position.played.get(san) ?? 0) + 1);
      seen.set(key, position);
    }
  }
  return [...seen.values()].filter(position => position.games >= MIN_GAMES);
}

const habitOf = (position: Seen): [string, number] =>
  [...position.played].toSorted(([, first], [, second]) => second - first)[0] ?? ['', 0];

const base = ({
  side,
  moves,
  name,
  games,
}: Seen): Pick<GameDrill, 'side' | 'moves' | 'name' | 'games'> => ({
  side,
  moves,
  name,
  games,
});

/** A position whose habit leaves the user's repertoire: their own move to play. */
function repertoireDrill(position: Seen): GameDrill | null {
  const [habit, times] = habitOf(position);
  const pick = entryAt(position.side, position.moves)?.answers[0];
  if (!pick || pick === habit) return null;
  const name = nameAlong(position.side, position.moves) || position.name;
  return { ...base(position), name, habit, times, better: [pick], why: 'repertoire' };
}

/** A position whose habit the masters hardly play: their main moves to play. */
async function bookDrill(explorer: Explorer, position: Seen): Promise<GameDrill | null> {
  const [habit, times] = habitOf(position);
  const ucis = playLine(position.moves)?.ucis;
  const data = ucis ? await mastersAfter(explorer, ucis) : null;
  if (!data) return null;
  const book = bookPosition(data);
  const rating = rateMove(book, habit);
  const fine = rating.move && shareOf(book, rating.move) >= FINE_SHARE;
  if (fine || book.moves.length === 0) return null;
  const better = book.moves.filter(move => shareOf(book, move) >= FINE_SHARE).map(move => move.san);
  // The position's own name: a game's names the opening it reached later.
  return {
    ...base(position),
    name: book.opening || position.name,
    habit,
    times,
    better,
    why: 'book',
  };
}

/** Whether `drill` is past one already found: the line had left the book before. */
const pastOne = (drill: GameDrill, found: readonly GameDrill[]): boolean =>
  found.some(
    other =>
      other.side === drill.side &&
      other.moves.length < drill.moves.length &&
      other.moves.every((san, i) => drill.moves[i] === san) &&
      drill.moves[other.moves.length] === other.habit,
  );

/** The drills the user's games call for, the earliest in the game first. */
export async function gameDrills(
  explorer: Explorer,
  { games, user }: { games: readonly Game[]; user: string },
): Promise<GameDrill[]> {
  const positions = seenPositions(games, user)
    .toSorted((first, second) => second.games - first.games)
    .slice(0, LOOKUPS)
    .toSorted((first, second) => first.moves.length - second.moves.length);
  const found: GameDrill[] = [];
  for (const position of positions) {
    // One lookup at a time, as Lichess's explorer asks.
    const drill = repertoireDrill(position) ?? (await bookDrill(explorer, position));
    if (drill && !pastOne(drill, found)) found.push(drill);
  }
  return found.slice(0, DRILLS);
}
