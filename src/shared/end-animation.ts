import { z } from 'zod/mini';
import { isSquare } from './chess/squares.ts';
import type { Square } from './chess/types.ts';
import { readStored, StorageKey, writeStored } from './storage.ts';

// What plays over the board as a game ends, picked in the settings' Play page:
// the board's wave (content/board-wave), confetti (page/game-over), or nothing,
// and after which results. The settings keep both here too, for the page world,
// which can't read them.

export const EndAnimationSchema = z.enum(['none', 'wave', 'confetti']);

export type EndAnimation = z.infer<typeof EndAnimationSchema>;

export const DEFAULT_END_ANIMATION: EndAnimation = 'wave';

/** The end animation as the settings last kept it; a storage it can't read gives the default. */
export function endAnimation(): EndAnimation {
  try {
    return readStored(StorageKey.endAnimation, EndAnimationSchema) ?? DEFAULT_END_ANIMATION;
  } catch {
    return DEFAULT_END_ANIMATION;
  }
}

export const keepEndAnimation = (pick: EndAnimation): void =>
  writeStored(StorageKey.endAnimation, pick);

/** After which results it plays: wins, wins and draws, or every game. */
export const EndResultsSchema = z.enum(['win', 'notLoss', 'all']);

export type EndResults = z.infer<typeof EndResultsSchema>;

export const DEFAULT_END_RESULTS: EndResults = 'win';

/** The results it plays after as the settings last kept them, as `endAnimation` reads. */
export function endResults(): EndResults {
  try {
    return readStored(StorageKey.endResults, EndResultsSchema) ?? DEFAULT_END_RESULTS;
  } catch {
    return DEFAULT_END_RESULTS;
  }
}

export const keepEndResults = (results: EndResults): void =>
  writeStored(StorageKey.endResults, results);

export const playsAfter = (results: EndResults, result: GameResult): boolean =>
  result === 'win' || results === 'all' || (results === 'notLoss' && result === 'draw');

/** A game's end as its player sees it, for the wave: its result and the square it starts from. */
const GameResultSchema = z.enum(['win', 'loss', 'draw']);

export type GameResult = z.infer<typeof GameResultSchema>;

export const GameEndSchema = z.object({
  result: GameResultSchema,
  /** The mated king's square, else the last move's, or null before any move. */
  square: z.nullable(z.custom<Square>(value => typeof value === 'string' && isSquare(value))),
});

export type GameEnd = z.infer<typeof GameEndSchema>;
