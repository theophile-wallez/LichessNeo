import { opposite } from '#shared/chess/types.ts';
import { isError } from '#page/review/classes/classes.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type TheoryEntry, type TheoryMove, theoryAt } from '#page/review/theory/book.ts';
import { oneOf } from './said.ts';

// What the coach says of a move in the opening books: the theory of the
// position it reaches, explained in full rather than in a quick remark, and,
// for a move that leaves them, what they play there instead.

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

// Theory's moves are its main ones: past three, the list buries them.
const SHOWN_MOVES = 3;

const bare = (san: string): string => san.replace(/[+#]$/, '');

// The moves after `move` ('a') are its opponent's; those in its place ('b'), its mover's.
const tokens = (moves: readonly TheoryMove[], move: MoveVerdict, base: 'b' | 'a'): string[] => {
  const color = base === 'a' ? opposite(move.color) : move.color;
  return moves
    .slice(0, SHOWN_MOVES)
    .map(({ san, uci }) => moveToken(san, color, { base, ucis: [uci] }));
};

const isMove =
  (move: MoveVerdict) =>
  (each: TheoryMove): boolean =>
    each.uci === move.uci || bare(each.san) === bare(move.san);

/**
 * The theory the coach explains on `move`: a mistake's, or a position's that
 * the move is no error to reach, or that theory goes on to from the position
 * before (a gambit the engine frowns on, on the free board where nothing is a
 * book move). An error that only transposes into theory gets none.
 */
export function shownTheory(move: MoveVerdict): TheoryEntry | null {
  const entry = theoryAt(move.position.fen);
  if (!entry) return null;
  if (entry.mistake || !isError(move.moveClass)) return entry;
  const before = theoryAt(move.previousPosition.fen);
  return before?.next.some(isMove(move)) ? entry : null;
}

/** Whether the coach explains `move`'s theory (`shownTheory`). */
export const hasTheory = (move: MoveVerdict): boolean => shownTheory(move) !== null;

/** The theory of the position `move` reaches, or why it's a mistake; null when the books have neither. */
export function theoryComment(
  move: MoveVerdict,
  language: ReviewLanguage,
  opening: string,
): CommentPart[] | null {
  const entry = shownTheory(move);
  if (!entry) return null;
  const next = tokens(entry.next, move, 'a');
  if (entry.mistake)
    return [
      say(entry.text),
      ...(next.length > 0
        ? [{ text: oneOf(language.theory.punish(next), move), droppable: false, detail: true }]
        : []),
    ];
  return [
    ...(opening ? [say(oneOf(language.openingLine(opening), move), true)] : []),
    say(entry.text),
    ...(next.length > 0
      ? [{ text: oneOf(language.theory.next(next), move), droppable: false, detail: true }]
      : []),
  ];
}

/** What theory plays where `move` leaves it, or null when the move stays in it or it had none. */
export function leftTheory(move: MoveVerdict, language: ReviewLanguage): string | null {
  // The books hold fewer lines than the masters play: a book move they lack is still theory.
  if (move.moveClass === 'book') return null;
  const entry = theoryAt(move.previousPosition.fen);
  if (!entry || entry.next.length === 0 || theoryAt(move.position.fen)) return null;
  if (entry.next.some(isMove(move))) return null;
  return oneOf(language.theory.left(tokens(entry.next, move, 'b')), move);
}
