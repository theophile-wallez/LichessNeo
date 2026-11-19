import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlayersAt } from '#page/review/theory/players.ts';
import type { CoachContext } from './context.ts';
import { type Findings, findings, punishes } from './fact.ts';
import { hash } from './hash.ts';
import { oneOf, turnStep } from './said.ts';
import { remark } from './remark.ts';
import { commonMistake } from './common-mistake.ts';
import { leftTheory, theoryComment } from './theory.ts';
import type { Threats } from './threat-facts.ts';
import { toldLevel, trajectory } from './trajectory.ts';
import { freshTold } from './told.ts';

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
  /** The ideas the moves just before said why of (`ideasOf`), not to say again. */
  readonly recent: ReadonlySet<string>;
  /** What Lichess's players around the mover's rating play in the position before it, once looked up. */
  readonly players?: PlayersAt | null;
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

interface Good {
  readonly move: MoveVerdict;
  readonly context: CoachContext;
  readonly all: Findings;
  /** How the evaluation moved, said when it changed level. */
  readonly told: CommentPart[];
}

// What the coach says of a move that needs no correction: its fact, or a
// remark, then the move a little better.
function goodComment({ move, context, all, told }: Good): CommentPart[] {
  const found = all.fact?.text ?? null;
  const better = all.followUp ? [say(all.followUp.text)] : [];
  return [say(found ?? remark(move, context)), ...better, ...told, ...detailsOf(all)];
}

/**
 * The coach's comment on a move: how the evaluation moved, and one fact from
 * the board and the engine, or a remark when a good move has nothing concrete
 * to say; after an error, the reply it lets in or the move to play instead. The trajectory
 * is what's dropped when the bubble lacks room, and is said only when the
 * advantage changes, unless it's all an error has to say. The error the game
 * turned on says so.
 */
function judgedComment(
  move: MoveVerdict,
  context: CoachContext,
  { opening, threats, turning, recent }: MoveContext,
): CommentPart[] {
  const { language } = context;
  if (move.moveClass === 'book')
    return [
      say(remark(move, context)),
      ...(opening ? [say(oneOf(language.openingLine(opening), move), true)] : []),
    ];
  const all = findings(move, language, threats, freshTold(recent));
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

/**
 * The coach's comment on a move: the opening theory of the position it
 * reaches, explained, while the books have it; past them, the judged comment,
 * led by what theory played instead on the move that leaves them.
 */
export function explanation(
  move: MoveVerdict,
  context: CoachContext,
  moveContext: MoveContext,
): CommentPart[] {
  const { language } = context;
  const common = commonMistake(move, language, moveContext.players ?? null);
  const theory = theoryComment(move, language, moveContext.opening);
  if (theory) return [...(common ? [say(common)] : []), ...theory];
  const left = leftTheory(move, language);
  const comment = judgedComment(move, context, moveContext);
  // How common an error is comes first: it's what the player most wants to hear of it.
  return [...(left ? [say(left)] : []), ...(common ? [say(common)] : []), ...comment];
}
