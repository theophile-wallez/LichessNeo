import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { parsePlacement } from '#shared/chess/fen.ts';
import { playSan } from '#shared/chess/san.ts';
import { type BookRating, rateMove } from './book.ts';
import { entryAt } from './repertoire.ts';
import type { Lines } from './settings.ts';
import { bookAt, bookBefore, movesTo, type PracticeState, type Refusal, sanAt } from './state.ts';

// Whether practice takes the user's move: a move of the book, unless too rare
// there or worse to the engine than the book's main move; the move to find,
// where the line has one; the user's own move, where their repertoire has one,
// any other good move then asking whether to make it theirs.

export type Verdict =
  | { readonly kind: 'ok' }
  | { readonly kind: 'refused'; readonly why: Refusal }
  /** A good move, but not the one the user's repertoire plays here. */
  | { readonly kind: 'deviated'; readonly pick: string };

const OK: Verdict = { kind: 'ok' };

const refused = (why: Refusal): Verdict => ({ kind: 'refused', why });

/** How common the move to `path` is in the book; null when the position before wasn't looked up. */
export function ratingAt(
  practice: PracticeState,
  analysis: Analysis,
  path: string,
): BookRating | null {
  const book = bookBefore(practice, analysis, path);
  return book ? rateMove(book, sanAt(analysis, path)) : null;
}

/** The moves the coach takes back: those the book never plays, or hardly. */
export const refuses = (rating: BookRating | null): boolean =>
  rating?.kind === 'out' || rating?.kind === 'rare';

/**
 * The win chance, in points, a book move may lose to the engine's: on the main lines, an
 * excellent move's at most (a gambit of the masters' loses more); on all of them, a good one's.
 */
const DUBIOUS_LOSS: Readonly<Record<Lines, number>> = { main: 2, all: 5 };

/**
 * A book move the engine finds worse than its own, the win chance it loses being
 * `loss`: there's better to learn. The book's main move never is, so a position always
 * has a move to find, and the hints and the answer point at it.
 */
export const dubious = (rating: BookRating | null, loss: number | null, lines: Lines): boolean =>
  rating !== null &&
  rating.kind !== 'main' &&
  rating.kind !== 'out' &&
  (loss ?? 0) >= DUBIOUS_LOSS[lines];

/** The win chance the move to a path loses, by the engine's verdict: null until it has one. */
export type LossAt = (path: string) => number | null;

/** The book's verdict alone. */
function bookVerdict(rating: BookRating | null, loss: number | null, lines: Lines): Verdict {
  if (refuses(rating)) return refused('rare');
  return dubious(rating, loss, lines) ? refused('dubious') : OK;
}

/** A book of the line's own takes its moves alone, and any mate where it mates. */
function ownVerdict(rating: BookRating | null, san: string): Verdict {
  if (rating?.kind !== 'out') return OK;
  const mates = san.endsWith('#') && rating.main?.san.endsWith('#') === true;
  return mates ? OK : refused('rare');
}

/** The move of the user's repertoire from the position at `path`, and the moves they found there. */
export function knownAt(
  practice: PracticeState,
  analysis: Analysis,
  path: string,
): { pick: string | null; answers: readonly string[] } {
  const moves = movesTo(analysis, path);
  const entry = moves ? entryAt(practice.side, moves) : null;
  const answers = entry?.answers ?? [];
  const pick = practice.settings.moves === 'mine' ? (answers[0] ?? null) : null;
  return { pick, answers };
}

/** Whether practice takes the user's move to `path`. */
export function moveVerdict(
  practice: PracticeState,
  analysis: Analysis,
  path: string,
  lossAt: LossAt,
): Verdict {
  const san = sanAt(analysis, path);
  const { aims } = practice;
  if (aims && parentPath(path) === aims.path) {
    if (aims.moves.includes(san)) return OK;
    return refused(san === aims.habit ? 'habit' : 'aim');
  }
  const rating = ratingAt(practice, analysis, path);
  if (practice.own) return ownVerdict(rating, san);
  const { pick, answers } = knownAt(practice, analysis, parentPath(path));
  if (pick === san) return OK;
  const book = bookVerdict(rating, lossAt(path), practice.settings.lines);
  const known = answers.includes(san);
  if (pick && (known || book.kind === 'ok')) return { kind: 'deviated', pick };
  return known ? OK : book;
}

/** A move to play, in both notations. */
export interface Target {
  readonly san: string;
  readonly uci: string;
}

/** `san` played on the position `fen`, in UCI; null when it can't be. */
function uciOf(fen: string, san: string): string | null {
  const [placement = '', turn] = fen.split(' ');
  return playSan(parsePlacement(placement), turn === 'b' ? 'black' : 'white', san)?.uci ?? null;
}

/**
 * The move the coach looks for on the user's turn at `path`, which the hints and
 * the answer give: the line's move to find, the user's own, else the book's main move.
 */
export function targetAt(practice: PracticeState, analysis: Analysis, path: string): Target | null {
  const { fen } = analysis.nodeAtPath(path);
  const own = practice.own ? null : knownAt(practice, analysis, path).pick;
  const wanted = practice.aims?.path === path ? practice.aims.moves[0] : own;
  const uci = wanted ? uciOf(fen, wanted) : null;
  if (wanted && uci) return { san: wanted, uci };
  const [main] = bookAt(practice, fen)?.moves ?? [];
  return main ? { san: main.san, uci: main.uci } : null;
}
