import type { CoachMood } from '#shared/coach.ts';

// The verdicts a move can get, in the summary's order.

export type MoveClass =
  | 'brilliant'
  | 'great'
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

export const MOVE_CLASSES: readonly MoveClass[] = [
  'brilliant',
  'great',
  'book',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

// Lichess's own annotation colors (--c-brilliant, --c-inaccuracy…), its good-move
// green a little lighter; the three good tiers in greys, under the annotated ones.
export const CLASS_COLORS: Readonly<Record<MoveClass, string>> = {
  brilliant: '#21c43a',
  great: '#77ba2c',
  book: '#ba9978',
  best: '#a3a1ad',
  excellent: '#96949f',
  good: '#8a8893',
  inaccuracy: '#53b2ea',
  mistake: '#e69d00',
  miss: '#de7cd3',
  blunder: '#df5353',
};

/** From best to worst: a mate verdict only ever makes a move's class worse. Book has no rank. */
export const RANK: readonly MoveClass[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

/** The summary's rows before its chevron is opened; a brilliant move joins them when there is one. */
export const SUMMARY_ROWS: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'great',
  'best',
  'excellent',
  'mistake',
  'miss',
  'blunder',
]);

/** The classes marked on the evaluation graph. */
export const GRAPH_DOTS: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'brilliant',
  'great',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
]);

/** Move list badges; book only shows on the last book move. */
export const LIST_BADGES: ReadonlySet<MoveClass> = new Set<MoveClass>([...GRAPH_DOTS, 'book']);

/** Moves that need no correction: no best-move arrow or button. */
export const GOOD: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'brilliant',
  'great',
  'best',
  'book',
]);

/** The moves the coach corrects: everything below good. */
export const isError = (moveClass: MoveClass): boolean =>
  !GOOD.has(moveClass) && moveClass !== 'excellent' && moveClass !== 'good';

const MOODS: Partial<Record<MoveClass, CoachMood>> = {
  brilliant: 'delight',
  great: 'delight',
  best: 'happy',
  excellent: 'happy',
  inaccuracy: 'doubt',
  mistake: 'worry',
  miss: 'sad',
  blunder: 'angry',
};

/** How the coach's face reacts to a verdict; null keeps it neutral. */
export const classMood = (moveClass: MoveClass): CoachMood | null => MOODS[moveClass] ?? null;
