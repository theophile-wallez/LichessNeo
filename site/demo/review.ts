import { z } from 'zod/mini';
import type { Mark } from '#page/board/review-arrows.ts';
import { findings, type Theme, themesOf } from '#page/review/coach/fact.ts';
import { explanation } from '#page/review/coach/explanation.ts';
import { passedFen, type Threat } from '#page/review/coach/threat.ts';
import type { Threats } from '#page/review/coach/threat-facts.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { PositionRecordSchema, type PositionRecord } from '#page/review/evaluation/score.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { judge, withMiss } from '#page/review/judge/judge.ts';
import { classCounts, playerAccuracy } from '#page/review/judge/summary.ts';
import { isPlayed, type MoveVerdict } from '#page/review/judge/types.ts';
import { divide, type Division } from '#page/review/rating/phases.ts';
import type { Review } from '#page/review/session.ts';
import { turningMove } from '#page/review/view/brief.ts';
import { GRAPH_DOTS } from '#page/review/classes/classes.ts';
import recorded from './opera.json' with { type: 'json' };

// The live review's game, judged and commented on by the Game Review's own
// code (src/page/review) from the engine's records that
// scripts/site/record-demo.ts kept in opera.json: the same verdicts and the
// same words the extension would show on lichess.org.

const DemoSchema = z.object({
  opening: z.string(),
  bookPly: z.number(),
  nodes: z.array(
    z.object({
      ply: z.number(),
      fen: z.string(),
      uci: z.optional(z.string()),
      san: z.optional(z.string()),
    }),
  ),
  records: z.array(PositionRecordSchema),
  threats: z.record(z.string(), PositionRecordSchema),
});

const demo = DemoSchema.parse(recorded);

export const GAME_ID = 'opera1858';

/** The game's positions, from the start. */
export const positions = demo.nodes;

/** The positions' records, White's view. */
export const records: readonly PositionRecord[] = demo.records;

/** Every move, judged in order, each linked to the one before it. */
export const moves: readonly MoveVerdict[] = (() => {
  const judged: MoveVerdict[] = [];
  for (let i = 1; i < demo.nodes.length; i++) {
    const previousPosition = demo.nodes[i - 1];
    const position = demo.nodes[i];
    const before = demo.records[i - 1];
    const after = demo.records[i];
    if (!previousPosition || !position || !isPlayed(position) || !before || !after)
      throw new Error(`the demo has no record for ply ${i}`);
    const move = judge({
      previousPosition,
      position,
      before,
      after,
      previousMove: judged.at(-1) ?? null,
      book: i <= demo.bookPly,
      chess960: false,
    });
    judged.push(withMiss(move));
  }
  return judged;
})();

export const accuracy = {
  white: playerAccuracy(moves, 'white'),
  black: playerAccuracy(moves, 'black'),
};

/** Where the middlegame and the endgame start, as the review divides a game. */
export const division: Division = divide(positions.map(position => position.fen));

/** The review of the whole game, as the extension's views read it. */
export const review = (rating: Review['rating']): Review => ({
  moves,
  draft: moves,
  total: positions.length,
  complete: true,
  positions: records,
  accuracy,
  counts: classCounts(moves),
  rating,
});

const turning = turningMove(moves.filter(move => GRAPH_DOTS.has(move.moveClass)));

function threatAt(fen: string): Threat | null {
  const passed = passedFen(fen);
  const record = passed === null ? undefined : demo.threats[passed];
  return passed === null || !record ? null : { fen: passed, record };
}

// As explain/threats.ts reads them: none around a book move, or one without a line.
const threatsAround = (move: MoveVerdict): Threats =>
  move.moveClass === 'book' || !move.after.line
    ? { before: null, after: null }
    : { before: threatAt(move.previousPosition.fen), after: threatAt(move.position.fen) };

/** What the coach says of a move, as the review's bubble has it (view/verdict.ts). */
export interface DemoComment {
  readonly parts: readonly CommentPart[];
  readonly themes: readonly Theme[];
  readonly drawing: readonly Mark[];
}

export function commentOn(move: MoveVerdict, coach: number, language: ReviewLanguage): DemoComment {
  const threats = threatsAround(move);
  const found = findings(move, language, threats);
  const parts = explanation(
    move,
    { gameId: GAME_ID, coach, language },
    {
      opening: move.ply === demo.bookPly ? demo.opening : '',
      threats,
      turning: move === turning,
    },
  );
  return {
    parts,
    themes: themesOf(found),
    drawing: found.fact?.drawing ?? found.followUp?.drawing ?? [],
  };
}
