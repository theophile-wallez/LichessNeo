import { queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { firstChild } from '#page/lichess/tree.ts';
import { CLASS_COLORS, LIST_BADGES, type MoveClass } from '#page/review/classes/classes.ts';
import { classImage } from '#page/review/classes/icon-svg.ts';
import { bookAt, judgeAt } from '#page/review/live/judging.ts';
import type { LiveState, Review } from '#page/review/session.ts';

// Badges and cost bars in Lichess's move list. We only set attributes on its
// moves and lines (snabbdom owns them); review.css draws the rest.

// A move that leads with a piece's figurine gets a little room after it (review/move-list.css).
const markPiece = (element: HTMLElement, san: string): void =>
  setData(element, 'lnExtPiece', /^[KQRBN]/.test(san) ? '' : null);

function markClass(move: HTMLElement, moveClass: MoveClass, badge: boolean): void {
  setData(move, 'lnExtCls', moveClass);
  setStyleProperty(move, '--ln-ext-class-color', CLASS_COLORS[moveClass]);
  setStyleProperty(move, '--ln-ext-class-icon', classImage(moveClass));
  setData(move, 'lnExtBadge', badge ? '' : null);
}

// A move giving away this much of the mover's win chance, or more, fills its bar.
const FULL_COST = 30;
// Below this, the bar would be a speck: none.
const MIN_COST = 2;

/** What a move gave away, as a bar beside it (review/move-list.css). */
function markCost(element: HTMLElement, loss: number): void {
  const cost = loss >= MIN_COST ? Math.min(1, loss / FULL_COST).toFixed(2) : null;
  setStyleProperty(element, '--ln-ext-cost', cost);
  // Its tooltip says how much (view/cost-tip.ts).
  setData(element, 'lnExtCost', cost === null ? null : String(Math.round(loss)));
}

/** The game's moves, from the review's draft; a book badge only on the last book move. */
function mainlineBadges(tree: Element, review: Review): void {
  const moves = queryAll(tree, ':scope > move:not(.empty)', HTMLElement);
  for (const [i, element] of moves.entries()) {
    const move = review.draft[i];
    if (!move) continue;
    // A deeper pass may change what a move cost without changing its class.
    markCost(element, move.loss);
    markPiece(element, move.san);
    // Skip a move whose verdict hasn't changed: its badge was set with it.
    if (element.dataset.lnExtCls === move.moveClass) continue;
    const lastBook = !(move.moveClass === 'book' && review.draft[i + 1]?.moveClass === 'book');
    markClass(element, move.moveClass, LIST_BADGES.has(move.moveClass) && lastBook);
  }
}

// Stripes the rows by move number, so a variation in between doesn't shift the stripes.
function stripes(tree: Element): void {
  let even = false;
  for (const child of tree.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === 'INDEX') even = Number.parseInt(child.textContent, 10) % 2 === 0;
    if (child.tagName !== 'INTERRUPT') setData(child, 'lnExtEven', even ? '' : null);
  }
}

// Marks the variations played here, which review.css shows while it hides
// Lichess's computer lines, and the computer lines they branch off, shown too as
// the way to them. Classes rather than data attributes because review.css reads
// `ln-ext-var` in a `:has()`, where an attribute selector slows every move.
function ownVariations(tree: Element, analysis: Analysis): void {
  const lines = queryAll(tree, 'interrupt line', Element);
  const own = new Set(
    lines.filter(line => {
      const path = line.querySelector('move[p]')?.getAttribute('p');
      return Boolean(path) && !analysis.nodeAtPath(path ?? '').comp;
    }),
  );
  const hosts = new Set<Element>();
  for (const line of own) {
    for (let up = line.parentElement?.closest('line'); up; up = up.parentElement?.closest('line'))
      if (!own.has(up)) hosts.add(up);
  }
  for (const line of lines) {
    line.classList.toggle('ln-ext-var', own.has(line));
    line.classList.toggle('ln-ext-var-host', hosts.has(line));
  }
}

/** Each move's verdict as it's judged, variations included: every move carries its path. */
export function liveBadges(
  live: LiveState,
  analysis: Analysis,
  moves: readonly HTMLElement[],
): void {
  for (const element of moves) {
    const path = element.getAttribute('p') ?? '';
    const move = judgeAt(live, analysis, path);
    if (move) markPiece(element, move.san);
    if (!move) {
      setData(element, 'lnExtCls', null);
      setData(element, 'lnExtBadge', null);
      continue;
    }
    const next = firstChild(analysis.nodeAtPath(path));
    const bookGoesOn = next !== null && bookAt(live, analysis, path + next.id) === true;
    const badge = LIST_BADGES.has(move.moveClass) && !(move.moveClass === 'book' && bookGoesOn);
    if (element.dataset.lnExtCls === move.moveClass && 'lnExtBadge' in element.dataset === badge)
      continue;
    markClass(element, move.moveClass, badge);
  }
}

export const treeMoves = (): HTMLElement[] =>
  queryAll(document, 'main.analyse .tview2 move[p]', HTMLElement);

/** The review's marks on the game's move list, and on the variations played off it. */
export function reviewBadges(live: LiveState, analysis: Analysis, review: Review): void {
  const tree = queryOne(document, 'main.analyse .tview2', Element);
  if (!tree) return;
  mainlineBadges(tree, review);
  stripes(tree);
  ownVariations(tree, analysis);
  liveBadges(live, analysis, queryAll(tree, 'interrupt line.ln-ext-var move[p]', HTMLElement));
}
