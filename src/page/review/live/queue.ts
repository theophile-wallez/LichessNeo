import { queryAll } from '#shared/dom.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { firstChild, pathPrefixes, type TreeNode } from '#page/lichess/tree.ts';
import type { LiveState, Session } from '#page/review/session.ts';
import { BOOK_PLIES } from './judging.ts';
import { analyseLive, lookUpBook } from './lookups.ts';

// What to look up next for the moves played on the board, one engine search
// and one masters lookup at a time.

/** Every move in Lichess's move list carries its tree path in `p`, variations included. */
export const treeMovePaths = (): string[] =>
  queryAll(document, 'main.analyse .tview2 move[p]', Element).map(
    move => move.getAttribute('p') ?? '',
  );

/** The line on from `node`, following each first child. */
function lineAfter(node: TreeNode): TreeNode[] {
  const line: TreeNode[] = [];
  for (let next = firstChild(node); next; next = firstChild(next)) line.push(next);
  return line;
}

/**
 * Positions to analyze, most urgent first: the move on the board (its
 * position, the one before, and the one before that for a miss), the next
 * move, the rest of the line, then everything else in the move list.
 */
export function wanted(analysis: Analysis, movePaths: readonly string[]): TreeNode[] {
  const path = analysis.nodeList;
  const after = lineAfter(analysis.node);
  return [
    ...path.slice(-3).toReversed(),
    ...after.slice(0, 1),
    ...path.slice(0, -3).toReversed(),
    ...after.slice(1),
    ...analysis.mainline,
    ...movePaths.map(movePath => analysis.nodeAtPath(movePath)),
  ];
}

/** The first position along `path` not looked up in the masters database, while the line is in it. */
export function bookGap(live: LiveState, analysis: Analysis, path: string): string | null {
  for (const prefix of pathPrefixes(path)) {
    const node = analysis.nodeAtPath(prefix);
    if (node.ply > BOOK_PLIES) return null;
    const entry = live.books.get(node.fen);
    if (!entry) return node.fen;
    if (!entry.book) return null;
  }
  return null;
}

function nextBookGap(
  live: LiveState,
  analysis: Analysis,
  movePaths: readonly string[],
): string | null {
  const line =
    analysis.path +
    lineAfter(analysis.node)
      .map(node => node.id)
      .join('');
  const mainline = analysis.mainline
    .slice(1)
    .map(node => node.id)
    .join('');
  for (const path of [line, mainline, ...movePaths]) {
    const fen = bookGap(live, analysis, path);
    if (fen) return fen;
  }
  return null;
}

// What the queue last found nothing to do for: the same again has nothing either.
const idle = new WeakMap<LiveState, string>();

/** Starts the next lookups the moves on the board wait for, if none is running. */
export function pump(session: Session, analysis: Analysis): void {
  const { live, work } = session;
  const movePaths = treeMovePaths();
  const key = [
    analysis.path,
    movePaths.length,
    live.evals.size,
    live.books.size,
    live.busy,
    live.bookBusy,
    live.error,
    live.noBook,
  ].join('|');
  if (idle.get(live) === key) return;
  let started = false;
  if (!live.busy && live.error === null) {
    // Skip the game's own positions: the game's analysis evaluates those.
    const game = analysis.synthetic ? null : new Set(work.nodes.map(node => node.fen));
    const node = wanted(analysis, movePaths).find(
      candidate => !live.evals.has(candidate.fen) && !game?.has(candidate.fen),
    );
    if (node) void analyseLive(session, analysis, node.fen);
    started = Boolean(node);
  }
  if (!live.bookBusy && !live.noBook) {
    const fen = nextBookGap(live, analysis, movePaths);
    if (fen) void lookUpBook(session, analysis, fen);
    started ||= Boolean(fen);
  }
  if (!started) idle.set(live, key);
}
