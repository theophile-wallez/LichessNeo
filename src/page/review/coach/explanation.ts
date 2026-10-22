import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { CoachContext } from './context.ts';
import { type Findings, findings, punishes } from './fact.ts';
import { hash } from './hash.ts';
import { continuesLine } from './line-facts.ts';
import { oneOf, turnStep } from './said.ts';
import { remark } from './remark.ts';
import type { Threats } from './threat-facts.ts';
import { toldLevel, trajectory } from './trajectory.ts';

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

/** The findings' technical sides, said last, below the rest. */
const detailsOf = ({ fact, followUp }: Findings): CommentPart[] =>
  [fact?.detail, followUp?.detail].flatMap(detail =>
    detail ? [{ text: detail, droppable: false, detail: true }] : [],
  );

/** What the coach knows of a move beyond its verdict. */
export interface MoveContext {
  /** A book move's opening ('' for none). */
  readonly opening: string;
  /** The threats around it, each once searched. */
  readonly threats: Threats;
  /** The error the game turned on, the brief's. */
  readonly turning: boolean;
}

interface Course {
  /** How the evaluation moved. */
  readonly course: string;
  /** Whether it moved to another level, which the comment then says. */
  readonly changed: boolean;
}

// The error a move punishes only offers the advantage: the move takes it, so
// the game is told from before the error, unless the error's comment already
// said where the game stands now.
function courseOf(move: MoveVerdict, language: ReviewLanguage, seed: number): Course {
  const punished = punishes(move) ? move.previousMove : null;
  const before = punished?.before ?? move.before;
  const course = trajectory({ before, after: move.after, mover: move.color, seed }, language);
  const level = toldLevel(move.after);
  const changed = level !== toldLevel(before) && (!punished || level !== toldLevel(punished.after));
  return { course, changed };
}

// A mate the comment speaks of says more than how the advantage moved.
const speaksOfMate = ({ fact, followUp }: Findings): boolean =>
  [fact, followUp].some(said => said?.theme === 'mate');

/**
 * A move the coach found nothing concrete about gets a remark, which says
 * nothing of the position: the engine's own line from there at least shows
 * where the game is going, and its moves can be played on the board. It's the
 * first thing dropped when the bubble lacks room.
 */
function continuation(move: MoveVerdict, language: ReviewLanguage): CommentPart[] {
  const line = continuesLine(move);
  if (!line) return [];
  return [{ text: oneOf(language.facts.continues(line), move), droppable: true, detail: true }];
}

interface Good {
  readonly move: MoveVerdict;
  readonly context: CoachContext;
  readonly all: Findings;
  /** How the evaluation moved, said when it changed level. */
  readonly told: CommentPart[];
}

// What the coach says of a move that needs no correction: its fact, or a
// remark and where the game goes from there, then the move a little better.
function goodComment({ move, context, all, told }: Good): CommentPart[] {
  const found = all.fact?.text ?? null;
  const better = all.followUp ? [say(all.followUp.text)] : [];
  const ahead = found === null ? continuation(move, context.language) : [];
  return [say(found ?? remark(move, context)), ...better, ...told, ...detailsOf(all), ...ahead];
}

/**
 * The coach's comment on a move: how the evaluation moved, and one fact from
 * the board and the engine, or a remark when a good move has nothing concrete
 * to say; after an error, the reply it lets in or the move to play instead. The trajectory
 * is what's dropped when the bubble lacks room, and is said only when the
 * advantage changes, unless it's all an error has to say. The error the game
 * turned on says so.
 */
export function explanation(
  move: MoveVerdict,
  context: CoachContext,
  { opening, threats, turning }: MoveContext,
): CommentPart[] {
  const { language } = context;
  if (move.moveClass === 'book')
    return [
      say(remark(move, context)),
      ...(opening ? [say(oneOf(language.openingLine(opening), move), true)] : []),
    ];
  const all = findings(move, language, threats);
  const { fact, followUp } = all;
  const found = fact?.text ?? null;
  const details = detailsOf(all);
  if (move.san.includes('#')) return [say(found ?? '')];
  const { course, changed } = courseOf(
    move,
    language,
    hash(`${context.gameId}:${context.coach}:t`) + turnStep(move),
  );
  const told = changed && !speaksOfMate({ fact, followUp }) ? [say(course, true)] : [];
  if (isError(move.moveClass)) {
    const turned = turning ? [say(oneOf(language.trajectory.turningPoint, move), true)] : [];
    if (found === null) return [say(course), ...turned];
    return [...told, ...turned, say(found), ...(followUp ? [say(followUp.text)] : []), ...details];
  }
  return goodComment({ move, context, all, told });
}
