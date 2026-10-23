import type { Color } from '#shared/chess/types.ts';
import type { Mastery } from '#page/review/practice/mastery.ts';
import type { Level, Moves } from '#page/review/practice/settings.ts';
import type { Ways } from './types.ts';

// What the coach says in practice's modes beyond a line against the book: the
// user's own repertoire, books of their own (a study, their repertoire), the
// daily review, the timed challenge, traps, their games' habits and the quiz,
// and what it cheers. {m} in a title is the move.

/** A book of the line's own, as the coach names it. */
export type OwnKind = 'study' | 'repertoire';

/** Where the position stands after the engine's reply, for the side that replied. */
export type Standing = 'equal' | 'better' | 'clearly' | 'winning';

export interface PracticeModeStrings {
  /** A good move that isn't the user's repertoire's. */
  readonly deviatedTitle: string;
  readonly deviated: Ways;
  readonly deviatedChoice: (move: string) => string;
  readonly adopt: string;
  /** The engine's reply to a refused move, and where it leaves the one who replied. */
  readonly refutation: (move: string, reply: string, standing: Standing, side: Color) => Ways;
  /** A book of the line's own: its intro, its moves, and a move it hasn't. */
  readonly ownIntro: (kind: OwnKind, name: string) => Ways;
  readonly ownMain: (kind: OwnKind) => Ways;
  readonly ownOther: (kind: OwnKind) => Ways;
  readonly ownOut: (kind: OwnKind, move: string) => Ways;
  readonly ownFind: (kind: OwnKind) => Ways;
  readonly ownOutTitle: (kind: OwnKind) => string;
  /** The move to find, played on request where it isn't the book's. */
  readonly revealedTitle: string;
  /** A drill of the user's games: their habit, and the move to find instead. */
  readonly habitTitle: string;
  readonly habit: (move: string) => Ways;
  readonly aimMissed: Ways;
  readonly gamesIntro: (times: number, games: number, move: string) => string;
  readonly gamesFind: (why: 'repertoire' | 'book') => Ways;
  readonly gamesDone: Ways;
  readonly nextDrill: string;
  /** Cheers: the day's goal met, an opening known better, lines grown deeper. */
  readonly goalMet: (days: number) => string;
  readonly mastery: (name: string, mastery: Mastery) => string;
  readonly grew: (moves: number) => string;
  /** The daily review. */
  readonly reviewIntro: Ways;
  readonly reviewFound: Ways;
  readonly reviewDone: string;
  readonly reviewSummary: (clean: number, total: number) => string;
  /** The timed challenge. */
  readonly blitzGo: Ways;
  readonly blitzMissed: string;
  readonly timeUp: string;
  readonly blitzScore: (score: number, played: number) => string;
  /** The minute's sum when not a move was played in it. */
  readonly blitzNone: Ways;
  readonly newRecord: Ways;
  readonly bestWas: (best: number) => string;
  readonly playAgain: string;
  /** Traps. */
  readonly trapWatch: string;
  readonly trapWatchWords: Ways;
  readonly trapTitle: string;
  readonly trapIntro: (move: string) => Ways;
  readonly trapTheme: (theme: string) => string | null;
  readonly trapDone: Ways;
  readonly trapsSummary: (solved: number, total: number) => string;
  readonly nextTrap: string;
  readonly trapsLoading: string;
  readonly trapsFailed: string;
  readonly noTraps: string;
  /** The quiz. */
  readonly quizTitle: string;
  readonly quizWords: Ways;
  readonly quizRight: (name: string) => Ways;
  readonly quizWrong: (name: string) => Ways;
  readonly quizDone: string;
  readonly quizScore: (score: number, total: number) => string;
  /** The round's end: back to the page. */
  readonly finish: string;
  readonly next: string;
}

/** The practice page's home, its tiles and its pages beyond the openings. */
export interface PracticeHomeStrings {
  /** The day's strip: days in a row, today's moves of the goal, positions known. */
  readonly streakDays: (days: number) => string;
  readonly streakTip: string;
  readonly today: (moves: number, goal: number) => string;
  readonly todayTip: string;
  readonly known: (positions: number) => string;
  readonly knownTip: string;
  /** The mode tiles: their names and what they say under them. */
  readonly modes: {
    readonly review: string;
    readonly reviewDue: (count: number) => string;
    readonly reviewNone: string;
    readonly traps: string;
    readonly trapsSub: string;
    readonly blitz: string;
    readonly blitzSub: (best: number) => string;
    readonly quiz: string;
    readonly quizSub: (best: number) => string;
    readonly games: string;
    readonly gamesSub: string;
    readonly repertoire: string;
    readonly repertoireSub: (positions: number) => string;
  };
  /** The coach's words over the home when positions are due. */
  readonly dueTitle: string;
  readonly dueWords: (count: number) => string;
  readonly favorites: string;
  /** An opening's card: how well it's known, and its tip. */
  readonly masteries: Readonly<Record<Mastery, string>>;
  readonly masteryTip: (found: number, positions: number) => string;
  /** The idea of the opening, the user's or the other side's. */
  readonly yourPlan: string;
  readonly theirPlan: string;
  /** The traps' page. */
  readonly trapsTitle: string;
  readonly trapsWhy: string;
  /** The games' page. */
  readonly gamesTitle: string;
  readonly gamesWhy: string;
  readonly gamesLoading: string;
  readonly gamesFailed: string;
  readonly gamesNone: string;
  readonly drillCard: (times: number, games: number) => string;
  readonly drillWhy: Readonly<Record<'repertoire' | 'book', string>>;
  readonly drillsStart: string;
  /** The repertoire's page: the user's tree, and their studies. */
  readonly repertoireTitle: string;
  readonly tabs: { readonly mine: string; readonly studies: string };
  readonly treeWhy: string;
  readonly treeEmpty: string;
  readonly practiceLine: string;
  readonly star: string;
  readonly unstar: string;
  readonly prune: string;
  readonly pruneConfirm: string;
  readonly studiesWhy: string;
  readonly studiesLoading: string;
  readonly studiesFailed: string;
  readonly studiesNone: string;
  readonly chapters: (count: number) => string;
  readonly chapterSide: (side: Color) => string;
  readonly noChapter: string;
  /** The settings' new rows. */
  readonly movesLabel: string;
  readonly moves: Readonly<Record<Moves, string>>;
  readonly levelLabel: string;
  readonly levels: Readonly<Record<Level, string>>;
  readonly levelMine: (rating: number) => string;
  readonly goalLabel: string;
  readonly goal: (moves: number) => string;
  readonly autoLength: string;
  readonly autoSum: string;
  /** The page's back button from a page of its own. */
  readonly home: string;
}
