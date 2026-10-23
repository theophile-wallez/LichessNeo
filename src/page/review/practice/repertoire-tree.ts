import type { Color } from '#shared/chess/types.ts';
import { type MasteryOf, masteryOf } from './mastery.ts';
import { type Entry, goesThrough } from './repertoire.ts';

// The user's repertoire as a tree of lines, for its page: the moves met, a
// row per run of moves that doesn't branch, each with how well the user knows
// the positions from it on.

export interface TreeRow {
  /** The moves to the row's first move. */
  readonly from: readonly string[];
  /** Its moves, in SAN. */
  readonly moves: readonly string[];
  readonly rows: readonly TreeRow[];
  readonly mastery: MasteryOf;
}

interface Trie {
  readonly next: Map<string, Trie>;
}

const trieOf = (entries: readonly Entry[]): Trie => {
  const root: Trie = { next: new Map() };
  const add = (moves: readonly string[]): void => {
    let node = root;
    for (const san of moves) {
      const child = node.next.get(san) ?? { next: new Map() };
      node.next.set(san, child);
      node = child;
    }
  };
  for (const entry of entries) for (const answer of entry.answers) add([...entry.moves, answer]);
  return root;
};

/** The entries from the move `san` played after `from` on: those past it, and the one it answers. */
export const branchEntries = (
  entries: readonly Entry[],
  from: readonly string[],
  san: string,
): Entry[] =>
  entries.filter(entry =>
    entry.moves.length > from.length
      ? goesThrough(entry.moves, [...from, san])
      : entry.moves.length === from.length &&
        goesThrough(entry.moves, from) &&
        entry.answers.includes(san),
  );

/** The node's one move, if it has only one. */
const single = (node: Trie): [string, Trie] | null => {
  const [only] = node.next;
  return node.next.size === 1 && only ? only : null;
};

function rowsOf(entries: readonly Entry[], node: Trie, from: readonly string[]): TreeRow[] {
  return [...node.next].map(([first, child]) => {
    const moves = [first];
    let at = child;
    // A run of single moves is one row.
    for (let only = single(at); only; only = single(at)) {
      const [san, next] = only;
      moves.push(san);
      at = next;
    }
    const to = [...from, ...moves];
    return {
      from,
      moves,
      rows: rowsOf(entries, at, to),
      mastery: masteryOf(branchEntries(entries, from, first)),
    };
  });
}

/** The side's repertoire as rows. */
export function repertoireRows(entries: readonly Entry[], side: Color): TreeRow[] {
  const own = entries.filter(entry => entry.side === side);
  return rowsOf(own, trieOf(own), []);
}

/** The repertoire without the move `san` after `from`, and what follows it: a branch pruned. */
export function withoutBranch(
  entries: readonly Entry[],
  side: Color,
  { from, san }: { from: readonly string[]; san: string },
): Entry[] {
  const line = [...from, san];
  return entries.flatMap(entry => {
    if (entry.side !== side) return [entry];
    if (goesThrough(entry.moves, line)) return [];
    const at = entry.moves.length === from.length && goesThrough(entry.moves, from);
    if (!at || !entry.answers.includes(san)) return [entry];
    const answers = entry.answers.filter(each => each !== san);
    return answers.length > 0 ? [{ ...entry, answers }] : [];
  });
}
