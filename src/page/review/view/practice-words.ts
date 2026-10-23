import { opposite } from '#shared/chess/types.ts';
import { parentPath } from '#page/lichess/tree.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { pickBy } from '#page/review/coach/said.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { BookError } from '#page/review/i18n/practice-types.ts';
import type { Ways } from '#page/review/i18n/types.ts';
import type { Miss, Played } from '#page/review/practice/state.ts';
import {
  type Answer,
  openingAt,
  type PracticeStatus,
  tally,
} from '#page/review/practice/status.ts';
import { judged, type Spoken } from './practice-spoken.ts';
import { refutationWords } from './practice-why.ts';
import {
  cheerWords,
  endModeWords,
  findWords,
  introModeWords,
  ownPlayedWords,
  refusedModeWords,
  trapWords,
  whyMissedMode,
} from './practice-words-modes.ts';

// What the coach says of practice's moves: how common the user's move is in
// the book, the book's reply, the opening the line reaches, and, once the
// engine has judged them, an error in either. A move refused gets why, the
// engine's punishment of it, and the move to find instead, never named: the
// hints and the answer are the user's to ask for. Late words go last, so that
// the typing carries on rather than starting over (`streamOn`). The modes'
// own words are in view/practice-words-modes.ts.

const isBookError = (moveClass: MoveClass): moveClass is BookError =>
  moveClass === 'mistake' || moveClass === 'miss' || moveClass === 'blunder';

function bookError(spoken: Spoken, path: string): BookError | null {
  const moveClass = judged(spoken, path)?.moveClass;
  return moveClass && isBookError(moveClass) ? moveClass : null;
}

const say = (text: string): CommentPart => ({ text, droppable: false });

/** How common the user's move is, the main move if it wasn't, and the engine's doubt. */
function playedWords(spoken: Spoken, played: Played): string[] {
  const { practice, source } = spoken;
  const { practice: strings } = spoken.session.language.ui;
  const { rating, path } = played;
  const own = ownPlayedWords(spoken, played);
  if (own) return own;
  if (!rating?.move) return [];
  const words = [
    pickBy(strings.share(source, { games: rating.move.games, of: rating.total }), path),
  ];
  const { main } = rating;
  if (main) {
    const count = { games: main.games, of: rating.total };
    words.push(pickBy(strings.mainIs(moveToken(main.san, practice.side), count), path));
  }
  const error = bookError(spoken, path);
  if (error) words.push(strings.doubts(error));
  return words;
}

function answerWords(spoken: Spoken, answer: Answer): string[] {
  const { practice: strings } = spoken.session.language.ui;
  const side = opposite(spoken.practice.side);
  const words =
    answer.count === null
      ? []
      : [pickBy(strings.answers(side, moveToken(answer.san, side), answer.count), answer.path)];
  const error = bookError(spoken, answer.path);
  if (error) words.push(pickBy(strings.punish(error), answer.path));
  return words;
}

/** The opening the last moves reached, when it's another than before them. */
function openingWords(spoken: Spoken, path: string, from: string): string[] {
  const { practice, analysis, session } = spoken;
  const name = openingAt(practice, analysis, path);
  if (!name || name === openingAt(practice, analysis, from)) return [];
  return [pickBy(session.language.openingLine(name), path)];
}

/** Before the user's first move: picked by where practice starts, so it stays as they play. */
export function introWords(spoken: Spoken): string[] {
  const { session, source, practice } = spoken;
  return (
    introModeWords(spoken) ?? [
      pickBy(session.language.ui.practice.intro(source), `intro|${practice.start}`),
    ]
  );
}

/** On the user's turn: their move, the reply, the opening, and their turn again. */
function yourWords(spoken: Spoken, played: Played | null, answer: Answer | null): string[] {
  const { practice: strings } = spoken.session.language.ui;
  // A round's card says what to do in its own words.
  const quick = spoken.session.view.round !== null;
  if (!answer)
    return [
      ...introWords(spoken),
      ...(quick ? [] : [pickBy(strings.yourMove, spoken.practice.start)]),
    ];
  const from = parentPath(played?.path ?? answer.path);
  const trap = trapWords(spoken, answer);
  if (trap) return trap;
  return [
    ...(played ? [...playedWords(spoken, played), ...cheerWords(spoken, played.path)] : []),
    ...answerWords(spoken, answer),
    ...openingWords(spoken, answer.path, from),
    pickBy(strings.yourMove, answer.path),
  ];
}

/** A refused move, taken back after a moment: few words, for the time it stays. */
function refusedWords(spoken: Spoken, played: Played, why: Miss['why']): string[] {
  const { practice: strings } = spoken.session.language.ui;
  const mode = refusedModeWords(spoken, played, why);
  if (mode) return mode;
  return [pickBy(why === 'dubious' ? strings.refusedDubious : strings.refused, played.path)];
}

function whyMissed(spoken: Spoken, miss: Miss): Ways {
  const { practice: strings } = spoken.session.language.ui;
  const move = moveToken(miss.played.san, spoken.practice.side);
  const mode = whyMissedMode(spoken, miss);
  if (mode) return mode;
  const { rating } = miss.played;
  if (miss.why === 'dubious') return strings.missedDubious(move);
  return rating?.move
    ? strings.missedRare(spoken.source, move, { games: rating.move.games, of: rating.total })
    : strings.missedOut(spoken.source, move);
}

/** Once it's taken back: why it was, its punishment, and the move to find, never named. */
function missWords(spoken: Spoken, miss: Miss): string[] {
  const { practice: strings } = spoken.session.language.ui;
  const { played, tries } = miss;
  const key = `${played.path}|${tries}`;
  const refutation = refutationWords(spoken, miss);
  return [
    pickBy(whyMissed(spoken, miss), `why|${key}`),
    ...(refutation ? [refutation] : []),
    ...findWords(spoken, key),
    ...(tries > 1 ? [pickBy(strings.stuck, `stuck|${key}`)] : []),
  ];
}

/** A streak this long is worth a word at the end. */
const BEST_STREAK = 5;

/** The line's end: a few words on how it went; the card's chip has the score. */
function endWords(spoken: Spoken, status: Extract<PracticeStatus, { kind: 'end' }>): string[] {
  const { session, analysis, practice } = spoken;
  const { practice: strings } = session.language.ui;
  const cheers = status.played ? cheerWords(spoken, status.played.path) : [];
  const mode = endModeWords(spoken);
  if (mode) return [...mode, ...cheers];
  const { inBook, main } = tally(practice, analysis);
  const { path } = analysis;
  const { misses, bestStreak, grew } = practice;
  return [
    pickBy(status.reason === 'length' ? strings.lineDone : strings.end, path),
    ...(inBook > 0 ? [strings.tally(inBook, main)] : []),
    ...(misses > 0 ? [pickBy(strings.missesTally(misses), `misses|${path}`)] : []),
    ...(bestStreak >= BEST_STREAK
      ? [pickBy(strings.bestStreak(bestStreak), `streak|${path}`)]
      : []),
    ...cheers,
    ...(grew === null ? [] : [strings.modes.grew(grew)]),
  ];
}

/** A good move that isn't the user's own: theirs to take back, or to make their own. */
function deviatedWords(spoken: Spoken, played: Played): string[] {
  const { modes } = spoken.session.language.ui.practice;
  return [
    pickBy(modes.deviated, played.path),
    modes.deviatedChoice(moveToken(played.san, spoken.practice.side)),
  ];
}

/** What the coach says of where practice stands, in the order it types it. */
export function practiceWords(spoken: Spoken, status: PracticeStatus): CommentPart[] {
  if (status.kind === 'yours')
    return (
      status.miss ? missWords(spoken, status.miss) : yourWords(spoken, status.played, status.answer)
    ).map(say);
  if (status.kind === 'refused') return refusedWords(spoken, status.played, status.why).map(say);
  if (status.kind === 'deviated') return deviatedWords(spoken, status.played).map(say);
  if (status.kind === 'end') return endWords(spoken, status).map(say);
  if (status.kind !== 'replying') return [];
  const words = status.played
    ? [...playedWords(spoken, status.played), ...cheerWords(spoken, status.played.path)]
    : introWords(spoken);
  return words.map(say);
}
