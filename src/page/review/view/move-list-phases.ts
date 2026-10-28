import { queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Division } from '#page/review/rating/phases.ts';
import { openingName, phaseStarts } from './phases.ts';

// The game's phases in Lichess's move list: the row of each phase's first move
// is named after it (data-ln-ext-phase on its number), which
// styles/review/move-list.css draws as a heading over the row.

const isIndex = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLElement && element.tagName === 'INDEX';

// A comment between two moves leaves Lichess an index and a "..." before Black's,
// which the review hides: Black's move stays on the row of White's.
function rowIndex(move: Element): HTMLElement | null {
  let element = move.previousElementSibling;
  while (element) {
    const hidden = element.nextElementSibling?.classList.contains('empty') === true;
    if (isIndex(element) && !(hidden && element.previousElementSibling)) return element;
    element = element.previousElementSibling;
  }
  return null;
}

/** Names the row each phase starts on; the opening's too, once the game leaves it. */
export function markPhaseRows(division: Division): void {
  const tree = queryOne(document, 'main.analyse .tview2', Element);
  if (!tree) return;
  const mainline = queryAll(tree, ':scope > move:not(.empty)', HTMLElement);
  const starts = phaseStarts(division);
  const names = new Map<HTMLElement, string>();
  // A move is of the phase of the position it's played from: its index in the list.
  for (const { index, name } of starts) {
    const row = mainline[index] && rowIndex(mainline[index]);
    if (row) names.set(row, name);
  }
  const first = queryOne(tree, ':scope > index', HTMLElement);
  if (first && names.size > 0 && !names.has(first)) names.set(first, openingName());
  for (const index of queryAll(tree, ':scope > index', HTMLElement))
    setData(index, 'lnExtPhase', names.get(index) ?? null);
}
