import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { playLine } from '#shared/chess/san.ts';
import type { Color } from '#shared/chess/types.ts';
import { boardAfter } from '#page/review/chess/board-after.ts';
import { sanAfter } from '#page/review/chess/notation.ts';
import type { PgnTree } from './pgn-tree.ts';

// Traps: real games' mistakes in an opening, from Lichess's puzzles of that
// opening, played early (an opening's puzzles are mostly middlegames'). The
// opponent plays the game's mistake, and the user has to punish it, as the
// puzzle's solution does. Lichess picks them by difficulty around a rating of
// 1500, as it does for a visitor: the user's own puzzle rating picks it.

const PuzzleSchema = z.object({
  game: z.object({ pgn: z.string() }),
  puzzle: z.object({
    id: z.string(),
    rating: z.number(),
    solution: z.array(z.string()),
    themes: z.array(z.string()),
    initialPly: z.number(),
  }),
});

const BatchSchema = z.object({ puzzles: z.array(PuzzleSchema) });

export interface Trap {
  readonly id: string;
  /** The game's moves up to the mistake, the mistake last, in SAN. */
  readonly moves: readonly string[];
  /** The punishment: the user's moves and the opponent's replies, in SAN. */
  readonly solution: readonly string[];
  readonly themes: readonly string[];
  readonly rating: number;
}

/** A trap is a mistake made early: at most this many plies in. */
const EARLY_PLIES = 24;

/** Lichess's difficulties, by how far from its rating of 1500 they pick. */
const DIFFICULTIES = [
  ['easiest', -600],
  ['easier', -300],
  ['normal', 0],
  ['harder', 300],
  ['hardest', 600],
] as const;

const BASE_RATING = 1500;

/** The difficulty whose puzzles are nearest `rating`. */
export function difficultyFor(rating: number | null): string {
  if (rating === null) return 'normal';
  const [best] = DIFFICULTIES.toSorted(
    ([, first], [, second]) =>
      Math.abs(BASE_RATING + first - rating) - Math.abs(BASE_RATING + second - rating),
  );
  return best?.[0] ?? 'normal';
}

/** The opening's key in Lichess's puzzle angles: "Italian_Game", "Kings_Gambit". */
export const angleOf = (family: string): string =>
  family
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .replaceAll(/[^A-Za-z0-9 -]/g, '')
    .trim()
    .replaceAll(' ', '_');

/** The solution in SAN, played from where the game's moves lead; null if it can't be read. */
function solutionSans(moves: readonly string[], solution: readonly string[]): string[] | null {
  const start = playLine(moves);
  if (!start) return null;
  let { board } = start;
  const sans: string[] = [];
  for (const uci of solution) {
    sans.push(sanAfter(board, uci));
    board = boardAfter(board, uci);
  }
  return sans;
}

export function parseTraps(text: string): Trap[] {
  const batch = parseJson(text, BatchSchema);
  return (batch?.puzzles ?? []).flatMap(({ game, puzzle }) => {
    const moves = game.pgn.split(' ').filter(Boolean);
    if (puzzle.initialPly > EARLY_PLIES) return [];
    const solution = solutionSans(moves, puzzle.solution);
    if (!solution) return [];
    const { id, themes, rating } = puzzle;
    return [{ id, moves, solution, themes, rating }];
  });
}

/** The batches read this visit: each costs 50 of the 300 puzzles an hour Lichess allows. */
const fetched = new Map<string, Trap[]>();

/** Asks Lichess for the opening's early puzzles, the user solving as `side`. */
export async function fetchTraps(
  family: string,
  { side, rating }: { side: Color; rating: number | null },
): Promise<Trap[]> {
  const query = new URLSearchParams({ nb: '50', color: side, difficulty: difficultyFor(rating) });
  const url = `/api/puzzle/batch/${angleOf(family)}?${query.toString()}`;
  const known = fetched.get(url);
  if (known) return known;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Puzzles: ${response.status}`);
  const traps = parseTraps(await response.text()).toSorted(
    (first, second) => first.moves.length - second.moves.length,
  );
  fetched.set(url, traps);
  return traps;
}

/** The trap as a line of moves, for its own book: the game's moves, then the punishment. */
export function trapTree(trap: Trap): PgnTree {
  const root: PgnTree = { comment: '', children: [] };
  let node = root;
  for (const san of [...trap.moves, ...trap.solution]) {
    const next = { san, comment: '', children: [] };
    node.children.push(next);
    node = next;
  }
  return root;
}
