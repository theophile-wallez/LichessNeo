import type { Color } from '#shared/chess/types.ts';
import { ownWords } from './chapters.ts';
import type { PgnTree } from './pgn-tree.ts';
import type { Entry } from './repertoire.ts';
import { withoutBranch } from './repertoire-tree.ts';

// The lines the user removed from their repertoire, gone from its studies too:
// left out of what's read back from them, and cut from their chapters once
// written again.

/** The lines removed, as `side|moves`, the last move the one removed. */
interface Pruned {
  readonly pruned?: readonly string[] | undefined;
}

/** A line removed, read back: its side, the moves before its move, and its move. */
function prunedLines(state: Pruned): { side: Color; from: string[]; san: string }[] {
  return (state.pruned ?? []).flatMap(key => {
    const [side, line = ''] = key.split('|');
    const moves = line.split(' ').filter(Boolean);
    const san = moves.pop();
    return (side === 'white' || side === 'black') && san ? [{ side, from: moves, san }] : [];
  });
}

/** The entries read without the lines the user removed since. */
export const withoutPruned = (state: Pruned, entries: readonly Entry[]): Entry[] =>
  prunedLines(state).reduce<Entry[]>(
    (kept, branch) => withoutBranch(kept, branch.side, branch),
    [...entries],
  );

/** The tree without the lines the user removed. */
export function prunedTree(state: Pruned, side: Color, tree: PgnTree): PgnTree {
  for (const { side: of, from, san } of prunedLines(state)) {
    if (of !== side) continue;
    let node: PgnTree | undefined = tree;
    for (const move of from) node = node?.children.find(child => child.san === move);
    const at = node?.children.findIndex(child => child.san === san) ?? -1;
    if (!node || at < 0) continue;
    node.children.splice(at, 1);
    // A record left on a position with no move would bring it back once read.
    if (node.children.length === 0) node.comment = ownWords(node.comment);
  }
  return tree;
}
