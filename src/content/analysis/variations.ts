import { queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { bareTurn, blackIndex, foldOf, foldState, worstClass } from './variation-folds.ts';

// The analysis's variations drawn as a tree (styles/analysis/variations.css). We only set
// attributes on Lichess's lines and moves: the branch the board is on, its costliest move,
// the black moves whose number is rewritten, and the long runs folded into a pill.

const TREE = 'main.analyse .tview2';

const isMove = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLElement && element.tagName === 'MOVE';

const isActive = (move: HTMLElement): boolean => move.classList.contains('active');

const indexOf = (move: Element): HTMLElement | null =>
  queryOne(move, ':scope > index', HTMLElement);

/** A line's moves, in runs of moves in a row: an alternative, a comment or a branch ends one. */
function moveRuns(line: Element): HTMLElement[][] {
  const runs: HTMLElement[][] = [[]];
  for (const child of line.children) {
    if (isMove(child)) runs.at(-1)?.push(child);
    else runs.push([]);
  }
  return runs.filter(run => run.length > 0);
}

/** The number a black move gets back, from the white move before it. */
function numberBack(move: HTMLElement): string | null {
  let previous = move.previousElementSibling;
  while (previous && !isMove(previous)) previous = previous.previousElementSibling;
  const index = previous && indexOf(previous);
  return index ? blackIndex(index.textContent) : null;
}

const startsLine = (previous: Element | null): boolean =>
  previous === null || previous.tagName === 'BRANCH';

// Lichess numbers a black move only where a line starts: one after an alternative (or a
// comment) or a fold loses its thread without it. Where a line starts, its branch tile says
// so, and the number's dots go.
function numberOf(move: HTMLElement, afterFold: boolean): string | null {
  const previous = move.previousElementSibling;
  const index = indexOf(move);
  if (index) return startsLine(previous) ? bareTurn(index.textContent) : null;
  const resumes = afterFold || (!startsLine(previous) && !isMove(previous));
  return resumes ? numberBack(move) : null;
}

function foldRun(run: readonly HTMLElement[]): void {
  // Open while the board is in it: the pill steps into the run, and leaving folds it again.
  const fold = run.some(isActive) ? null : foldOf(run.length);
  const hidden = fold ? fold.end - fold.start : 0;
  for (const [i, move] of run.entries()) {
    const state = foldState(fold, i);
    setData(move, 'lrExtFold', state);
    setData(
      move,
      'lrExtFoldLabel',
      state === 'pill' ? message('variationFolded', `${hidden}`) : null,
    );
    setData(move, 'lrExtIndex', state === null ? numberOf(move, i === fold?.end) : null);
  }
}

// The review's verdict on a move, and Lichess's annotation glyphs, as classes.
const moveClasses = (move: HTMLElement): string[] =>
  move.dataset.lrExtCls ? [move.dataset.lrExtCls, ...move.classList] : [...move.classList];

function markLine(line: HTMLElement): void {
  const moves = [...line.children].filter(isMove);
  setData(line, 'lrExtOn', moves.some(isActive) ? '' : null);
  setData(line, 'lrExtWorst', worstClass(moves.flatMap(moveClasses)));
  for (const run of moveRuns(line)) foldRun(run);
}

/** Marks every variation line of the move list `tree`. */
export const markTree = (tree: Element): void => {
  for (const line of queryAll(tree, 'interrupt :is(line, inline)', HTMLElement)) markLine(line);
};

// Marked as soon as Lichess redraws the list (a move played, the board moved, a review's
// badge), before it paints: a tick later, the folds would flash open. Our own marks aren't
// watched, so they don't come back here.
let watched: Element | null = null;
const observer = new MutationObserver(() => {
  if (watched) markTree(watched);
});

function sync(): void {
  const tree = queryOne(document, TREE, HTMLElement);
  if (tree === watched) return;
  observer.disconnect();
  watched = tree;
  if (!tree) return;
  observer.observe(tree, {
    subtree: true,
    childList: true,
    attributeFilter: ['class', 'data-lr-ext-cls'],
  });
  markTree(tree);
}

export const variations: Feature = {
  name: 'variations',
  start: () => onEveryTick('variations', sync),
};
