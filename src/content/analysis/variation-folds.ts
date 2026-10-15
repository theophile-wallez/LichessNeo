// The rules behind the variations' tree (variations.ts): which moves of a long run fold,
// a black move's number, and a branch's costliest move.

// A run folds only when it hides at least this many moves: fewer aren't worth a pill.
const FOLDED_AT_LEAST = 4;
// Shown before the fold, and after it: the line's start and where it ends up.
const KEPT_BEFORE = 2;
const KEPT_AFTER = 1;

/** The moves of a run that fold, `start` (the pill) to `end` (excluded). */
export interface Fold {
  readonly start: number;
  readonly end: number;
}

/** What folds of a run of `length` moves in a row, if anything. */
export function foldOf(length: number): Fold | null {
  const end = length - KEPT_AFTER;
  return end - KEPT_BEFORE >= FOLDED_AT_LEAST ? { start: KEPT_BEFORE, end } : null;
}

export type FoldState = 'pill' | 'hidden';

/** Whether the run's `i`th move stays, is drawn as the pill, or is hidden behind it. */
export function foldState(fold: Fold | null, i: number): FoldState | null {
  if (fold === null || i < fold.start || i >= fold.end) return null;
  return i === fold.start ? 'pill' : 'hidden';
}

/** A black move's number, from the white move's before it: "56." gives "56...", as Lichess writes it. */
export function blackIndex(whiteIndex: string): string | null {
  const turn = /^(\d+)\.$/.exec(whiteIndex.trim())?.[1];
  return turn === undefined ? null : `${turn}...`;
}

/** A black move's number without its dots: "6..." gives "6". */
export function bareTurn(index: string): string | null {
  return /^(\d+)\.\.\.$/.exec(index.trim())?.[1] ?? null;
}

// The classes that tint a branch, from the least costly: the review's, and Lichess's annotations.
const COSTLY = ['mistake', 'miss', 'blunder'] as const;
type CostlyClass = (typeof COSTLY)[number];

/** The costliest of the classes given, if one is costly enough to tint its branch. */
export function worstClass(classes: Iterable<string>): CostlyClass | null {
  let worst = -1;
  for (const name of classes) {
    const rank = COSTLY.findIndex(costly => costly === name);
    if (rank > worst) worst = rank;
  }
  return COSTLY[worst] ?? null;
}
