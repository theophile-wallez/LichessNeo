import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { judge, withMiss } from '#page/review/judge/judge.ts';
import { classCounts, playerAccuracy } from '#page/review/judge/summary.ts';
import { type GamePosition, isPlayed } from '#page/review/judge/types.ts';
import type { GameRating } from '#page/review/rating/rate-game.ts';
import type { Review, JudgedMove } from '#page/review/session.ts';
import { settleDraw } from './draws.ts';

// The game's review, rebuilt from what's known of its positions.

interface BuildInput {
  readonly nodes: readonly GamePosition[];
  readonly deep: readonly (PositionRecord | undefined)[];
  readonly rough: readonly (PositionRecord | undefined)[];
  /** The moves judged so far at full depth, filled in as their positions arrive. */
  readonly moves: (JudgedMove | undefined)[];
  readonly bookPly: number;
  readonly chess960: boolean;
}

interface MoveInput {
  readonly index: number;
  readonly before: PositionRecord | undefined;
  readonly after: PositionRecord | undefined;
  readonly previousMove: JudgedMove | undefined;
}

/** The move to position `index`, its ply being that index. */
function judgeIndex(
  input: BuildInput,
  { index, before, after, previousMove }: MoveInput,
): JudgedMove | undefined {
  const previousPosition = input.nodes[index - 1];
  const position = input.nodes[index];
  if (!previousPosition || !position || !isPlayed(position) || !before || !after) return undefined;
  const move = judge({
    previousPosition,
    position,
    before,
    after,
    previousMove,
    book: index <= input.bookPly,
    chess960: input.chess960,
  });
  return { ...move, ply: index };
}

/**
 * Judges every move whose positions are in. A move needs the positions before
 * and after it, and also the one before those: a move that fails to punish
 * the opponent's error is a miss, so the opponent's move is judged with it.
 */
function judgeMainline(input: BuildInput): void {
  const { nodes, deep, moves } = input;
  const at = (index: number, previousMove?: JudgedMove): JudgedMove | undefined =>
    judgeIndex(input, { index, before: deep[index - 1], after: deep[index], previousMove });
  for (let i = 1; i < nodes.length; i++) {
    if (moves[i - 1] || !deep[i - 1] || !deep[i] || (i >= 2 && !deep[i - 2])) continue;
    moves[i - 1] = at(i, i >= 2 ? (moves[i - 2] ?? at(i - 1)) : undefined);
  }
  // A move judged before the one it answers now links to it, and may turn out a miss, as
  // the moves before it show it was punishing an error.
  for (let k = 1; k < moves.length; k++) {
    const move = moves[k];
    const previousMove = moves[k - 1];
    if (move && previousMove && move.previousMove !== previousMove)
      moves[k] = withMiss({ ...move, previousMove });
  }
}

/**
 * The moves at full depth, and a draft from the quick pass (or the server
 * analysis) for the others: it stands in on the graph, the move list, the
 * counts and the accuracy until the full depth's verdict comes.
 */
function draftMoves(input: BuildInput): (JudgedMove | undefined)[] {
  const { nodes, deep, rough, moves } = input;
  const record = (index: number): PositionRecord | undefined => deep[index] ?? rough[index];
  const draft: (JudgedMove | undefined)[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const judged = moves[i - 1];
    const before = record(i - 1);
    const after = record(i);
    draft[i - 1] =
      judged || !before || !after
        ? judged
        : judgeIndex(input, { index: i, before, after, previousMove: draft[i - 2] });
  }
  return draft;
}

export interface ReviewInput extends BuildInput {
  readonly previous: Review | null;
  /** The game rating, once every move is judged. */
  readonly rate: (moves: readonly JudgedMove[]) => GameRating;
}

export function buildReview(given: ReviewInput): Review {
  const input: ReviewInput = {
    ...given,
    deep: settleDraw(given.nodes, given.deep),
    rough: settleDraw(given.nodes, given.rough),
  };
  judgeMainline(input);
  const { nodes, deep, rough, moves } = input;
  const draft = draftMoves(input);
  const judged = draft.filter(move => move !== undefined);
  const judgedMoves = moves.filter(move => move !== undefined);
  const complete = judgedMoves.length === nodes.length - 1;
  return {
    moves,
    draft,
    total: nodes.length,
    complete,
    positions: nodes.map((_, i) => deep[i] ?? rough[i] ?? null),
    accuracy: { white: playerAccuracy(judged, 'white'), black: playerAccuracy(judged, 'black') },
    counts: classCounts(judged),
    rating: complete ? (input.previous?.rating ?? input.rate(judgedMoves)) : null,
  };
}
