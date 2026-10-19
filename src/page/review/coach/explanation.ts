import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type CoachContext, moveSeed } from './context.ts';
import { findings, punishes } from './fact.ts';
import { hash } from './hash.ts';
import { remark } from './remark.ts';
import type { Threats } from './threat-facts.ts';
import { evaluationLevel, trajectory } from './trajectory.ts';

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
 * is what's dropped when the bubble lacks room, and is said only when the
 * advantage changes, unless it's all an error has to say.
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
  // The error a move punishes only offers the advantage: the move takes it, so
  // the game is told from before the error.
  const before = (punishes(move) ? move.previousMove?.before : null) ?? move.before;
  const course = trajectory({ before, after: move.after, mover: move.color, seed }, language);
  const changed = evaluationLevel(before) !== evaluationLevel(move.after);
  const told = changed ? [say(course, true)] : [];
  if (isError(move.moveClass)) {
    if (found === null) return [say(course)];
    return [...told, say(found), ...(followUp ? [say(followUp.text)] : [])];
  }
  return [say(found ?? remark(move, context)), ...told];
}
