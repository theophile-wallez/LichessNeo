import { fenTurn } from '#shared/chess/fen.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath, pathPrefixes } from '#page/lichess/tree.ts';
import type { BookCount } from '#page/review/i18n/practice-types.ts';
import { type BookPosition, replies } from './book.ts';
import {
  bookAt,
  bookBefore,
  bookDb,
  inLine,
  lineLength,
  type Miss,
  moveKey,
  type Played,
  type PracticeState,
  type Refusal,
  sanAt,
  yourMoves,
} from './state.ts';
import { type LossAt, moveVerdict, ratingAt } from './verdict.ts';

// Where practice stands with the board: the user's turn, the book's reply on
// its way, a move the coach refuses, or the book's end. It's read off the board
// each time, so taking moves back, or stepping through them, just works.

/** The book's reply, and its games: null when the position before wasn't looked up. */
export interface Answer {
  readonly path: string;
  readonly san: string;
  readonly count: BookCount | null;
}

export type PracticeStatus =
  /** The board has gone back past where practice started. */
  | { readonly kind: 'left' }
  /** The explorer hasn't answered for the position on the board yet. */
  | { readonly kind: 'looking' }
  | {
      readonly kind: 'yours';
      readonly played: Played | null;
      readonly answer: Answer | null;
      readonly book: BookPosition;
      /** The move refused from here, to find again. */
      readonly miss: Miss | null;
    }
  | {
      readonly kind: 'replying';
      readonly played: Played | null;
      /** Null while the explorer looks the position up. */
      readonly book: BookPosition | null;
    }
  /** A move practice doesn't take, and why: the coach takes it back. */
  | { readonly kind: 'refused'; readonly played: Played; readonly why: Refusal }
  /** A good move, but not the user's own: theirs to take back, or to make their own. */
  | { readonly kind: 'deviated'; readonly played: Played; readonly pick: string }
  /** The book ends, or the line is as long as it goes. */
  | { readonly kind: 'end'; readonly played: Played | null; readonly reason: 'book' | 'length' };

const playedAt = (practice: PracticeState, analysis: Analysis, path: string): Played => ({
  path,
  san: sanAt(analysis, path),
  rating: ratingAt(practice, analysis, path),
});

function answerAt(practice: PracticeState, analysis: Analysis, path: string): Answer {
  const san = sanAt(analysis, path);
  const book = bookBefore(practice, analysis, path);
  const move = book?.moves.find(each => each.san === san);
  return { path, san, count: book && move ? { games: move.games, of: book.games } : null };
}

/** The line has as many of the user's moves as it goes to. */
const longEnough = (practice: PracticeState, analysis: Analysis, path: string): boolean => {
  const length = lineLength(practice);
  return length > 0 && yourMoves(practice, analysis, path) >= length;
};

/** On the user's turn: their move to find, unless the line or the book has ended. */
function yourStatus(practice: PracticeState, analysis: Analysis): PracticeStatus {
  const { path, node } = analysis;
  const book = bookAt(practice, node.fen);
  if (!book)
    return practice.own ? { kind: 'end', played: null, reason: 'book' } : { kind: 'looking' };
  const before = parentPath(path);
  const played = inLine(practice, before) ? playedAt(practice, analysis, before) : null;
  if (longEnough(practice, analysis, path)) return { kind: 'end', played, reason: 'length' };
  if (book.moves.length === 0) return { kind: 'end', played, reason: 'book' };
  const answer = inLine(practice, path) ? answerAt(practice, analysis, path) : null;
  const miss =
    practice.miss && parentPath(practice.miss.played.path) === path ? practice.miss : null;
  return { kind: 'yours', played, answer, book, miss };
}

export function practiceStatus(
  practice: PracticeState,
  analysis: Analysis,
  lossAt: LossAt,
): PracticeStatus {
  const { path, node } = analysis;
  if (!path.startsWith(practice.start)) return { kind: 'left' };
  if (fenTurn(node.fen) === practice.side) return yourStatus(practice, analysis);
  const book = bookAt(practice, node.fen);
  const played = inLine(practice, path) ? playedAt(practice, analysis, path) : null;
  if (played) {
    const verdict = moveVerdict(practice, analysis, path, lossAt);
    if (verdict.kind === 'refused') return { kind: 'refused', played, why: verdict.why };
    if (verdict.kind === 'deviated') return { kind: 'deviated', played, pick: verdict.pick };
    if (longEnough(practice, analysis, path)) return { kind: 'end', played, reason: 'length' };
  }
  const ends = practice.own ? !book : false;
  if (ends || (book && replies(book, bookDb(practice)).length === 0))
    return { kind: 'end', played, reason: 'book' };
  return { kind: 'replying', played, book };
}

/** The opening the line has reached at `path`, named by the last move along it that names one. */
export function openingAt(practice: PracticeState, analysis: Analysis, path: string): string {
  for (let at = path; inLine(practice, at); at = parentPath(at)) {
    const san = sanAt(analysis, at);
    const name = bookBefore(practice, analysis, at)?.moves.find(each => each.san === san)?.opening;
    if (name) return name;
  }
  return '';
}

/** The user's own moves along the line, in the book, and how many were the main move. */
export function tally(
  practice: PracticeState,
  analysis: Analysis,
): { inBook: number; main: number } {
  let inBook = 0;
  let main = 0;
  for (const path of pathPrefixes(analysis.path).filter(each => inLine(practice, each))) {
    const before = analysis.nodeAtPath(parentPath(path));
    if (fenTurn(before.fen) !== practice.side) continue;
    if (practice.revealed.has(moveKey(parentPath(path), sanAt(analysis, path)))) continue;
    const rating = ratingAt(practice, analysis, path);
    if (rating && rating.kind !== 'out') inBook++;
    if (rating?.kind === 'main') main++;
  }
  return { inBook, main };
}

/** Where taking back goes: the user's turn before their last move, or where practice started. */
export function takeBackPath(practice: PracticeState, analysis: Analysis): string {
  for (let at = parentPath(analysis.path); inLine(practice, at); at = parentPath(at))
    if (fenTurn(analysis.nodeAtPath(at).fen) === practice.side) return at;
  return practice.start;
}
