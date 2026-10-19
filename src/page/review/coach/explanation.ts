import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type CoachContext, moveSeed } from './context.ts';
import { findings } from './fact.ts';
import { hash } from './hash.ts';
import { remark } from './remark.ts';
import type { Threats } from './threat-facts.ts';
import { trajectory } from './trajectory.ts';

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

/** What the coach knows of a move beyond its verdict. */
export interface MoveContext {
  /** A book move's opening ('' for none). */
  readonly opening: string;
  /** The threats around it, each once searched. */
  readonly threats: Threats;
}

/**
 * The coach's comment on a move: how the evaluation moved, and one fact from
 * the board and the engine, or a remark when a good move has nothing concrete
 * to say; after an error, the reply it lets in or the move to play instead. The trajectory
 * is what's dropped when the bubble lacks room.
 */
export function explanation(
  move: MoveVerdict,
  context: CoachContext,
  { opening, threats }: MoveContext,
): CommentPart[] {
  const { language } = context;
  if (move.moveClass === 'book')
    return [
      say(remark(move, context)),
      ...(opening ? [say(language.openingLine(opening), true)] : []),
    ];
  const { fact, followUp } = findings(move, language.facts, threats);
  const found = fact?.text ?? null;
  if (move.san.includes('#')) return [say(found ?? '')];
  const seed = hash(`${moveSeed(move, context)}:t`);
  const course = trajectory(
    { before: move.before, after: move.after, mover: move.color, seed },
    language,
  );
  if (isError(move.moveClass)) {
    if (found === null) return [say(course)];
    return [say(course, true), say(found), ...(followUp ? [say(followUp.text)] : [])];
  }
  return [say(found ?? remark(move, context)), say(course, true)];
}
