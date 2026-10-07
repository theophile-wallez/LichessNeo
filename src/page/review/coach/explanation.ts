import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type CoachContext, moveSeed } from './context.ts';
import { findings } from './fact.ts';
import { hash } from './hash.ts';
import { remark } from './remark.ts';
import { trajectory } from './trajectory.ts';

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

/**
 * The coach's comment on a move: how the evaluation moved, and one fact from
 * the board and the engine, or a remark when a good move has nothing concrete
 * to say; after a mistake or a blunder, the reply it lets in. The trajectory
 * is what's dropped when the bubble lacks room.
 * `opening` names a book move's opening ('' for none).
 */
export function explanation(
  move: MoveVerdict,
  context: CoachContext,
  opening: string,
): CommentPart[] {
  const { language } = context;
  if (move.moveClass === 'book')
    return [
      say(remark(move, context)),
      ...(opening ? [say(language.openingLine(opening), true)] : []),
    ];
  const { fact, threat } = findings(move, language.facts);
  const found = fact?.text ?? null;
  if (move.san.includes('#')) return [say(found ?? '')];
  const seed = hash(`${moveSeed(move, context)}:t`);
  const course = trajectory(
    { before: move.before, after: move.after, mover: move.color, seed },
    language,
  );
  if (isError(move.moveClass)) {
    if (found === null) return [say(course)];
    return [say(course, true), say(found), ...(threat ? [say(threat.text)] : [])];
  }
  return [say(found ?? remark(move, context)), say(course, true)];
}
