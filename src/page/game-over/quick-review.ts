import type { Color } from '#shared/chess/types.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { uciPosition } from '#page/review/engine/position.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { GAME_OVER_SEARCH } from '#page/review/engine/settings.ts';
import type { Stockfish } from '#page/review/engine/stockfish.ts';
import type { EngineResult } from '#page/review/engine/uci.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { buildReview } from '#page/review/game/build.ts';
import type { GamePosition, MoveVerdict } from '#page/review/judge/types.ts';
import type { GameRating } from '#page/review/rating/rate-game.ts';

// The coach's quick look at a game that just ended: every position at a low
// depth, judged as the review judges them, for the player's accuracy and
// counts. Nothing here goes in Game Review's cache: it searches deeper, and
// the card takes its figures once its analysis is done (precompute.ts).

/** A search of the position `uciPosition` gives. */
export type Analyse = (position: string) => Promise<EngineResult>;

export interface QuickReviewInput {
  readonly positions: readonly GamePosition[];
  readonly color: Color;
  /** The last book move's ply, 0 for none. */
  readonly bookPly: number;
  readonly chess960: boolean;
  readonly analyse: Analyse;
  /** The share of the positions searched so far, 0 to 1. */
  readonly onProgress?: (share: number) => void;
}

export interface PlayerSummary {
  /** Null when the player made no move. */
  readonly accuracy: number | null;
  readonly counts: Readonly<Partial<Record<MoveClass, number>>>;
  /** The ply of the player's first move of each class, for the card's chips to lead to. */
  readonly firstPlies: Readonly<Partial<Record<MoveClass, number>>>;
}

// The review rates a game from full-depth verdicts only.
const NO_RATING: GameRating = { white: null, black: null };

export interface SummaryInput {
  readonly positions: readonly GamePosition[];
  /** A record per position, as the engine left them. */
  readonly records: readonly (PositionRecord | undefined)[];
  readonly color: Color;
  readonly bookPly: number;
  readonly chess960: boolean;
}

type PlacedMove = Pick<MoveVerdict, 'ply' | 'color' | 'moveClass'>;

function firstPlies(
  moves: readonly (PlacedMove | undefined)[],
  color: Color,
): Partial<Record<MoveClass, number>> {
  const plies: Partial<Record<MoveClass, number>> = {};
  for (const move of moves) if (move?.color === color) plies[move.moveClass] ??= move.ply;
  return plies;
}

/** The player's accuracy and counts, judged from the records as the review judges them. */
export function summarize({
  positions,
  records,
  color,
  bookPly,
  chess960,
}: SummaryInput): PlayerSummary {
  const review = buildReview({
    nodes: positions,
    deep: records,
    rough: [],
    moves: [],
    bookPly,
    chess960,
    previous: null,
    rate: () => NO_RATING,
  });
  return {
    accuracy: review.accuracy[color],
    counts: review.counts[color],
    firstPlies: firstPlies(review.draft, color),
  };
}

export async function quickReview(input: QuickReviewInput): Promise<PlayerSummary> {
  const { positions, chess960, analyse, onProgress } = input;
  const records: PositionRecord[] = [];
  for (const [i, position] of positions.entries()) {
    const result = await analyse(uciPosition(positions.slice(0, i + 1), chess960));
    records.push(toRecord(position.fen, result));
    onProgress?.((i + 1) / positions.length);
  }
  return summarize({ ...input, records });
}

/** The quick look's searches, on an engine booted for the game. */
export const quickSearch =
  (engine: Stockfish): Analyse =>
  position =>
    engine.analyse({ position, limits: GAME_OVER_SEARCH });
