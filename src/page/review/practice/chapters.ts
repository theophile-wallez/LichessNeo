import type { Color } from '#shared/chess/types.ts';
import type { PgnNode, PgnTree } from './pgn-tree.ts';
import { type Entry, goesThrough } from './repertoire.ts';

// The repertoire as a study's chapters: one per opening, its lines the moves
// practiced, each position the user moved from carrying its record in a
// comment of ours ("Lichess Neo · seen 4 · missed 1 · last …"), after the
// user's own words if they wrote some. The comments are plain text: Lichess
// keeps no other data in a chapter's moves.

/** The chapter of positions in no opening, or past a study's chapters. */
export const OTHER_CHAPTER = 'Other openings';

/** The chapter an opening goes in: its family, its name before its variation's. */
export function chapterOf(name: string): string {
  const family = name.split(':')[0]?.trim() ?? '';
  return family === '' ? OTHER_CHAPTER : family;
}

const MARK = 'Lichess Neo ·';

const MINUTE_MS = 60_000;

/** A time as a comment keeps it: to the minute. */
export const toMinute = (ms: number): number => Math.floor(ms / MINUTE_MS) * MINUTE_MS;

/** A time as the comment writes it, to the minute: "2026-10-23 08:55 UTC". */
const timeText = (ms: number): string =>
  `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export function dataComment(entry: Entry): string {
  const parts = [`seen ${entry.seen}`, `missed ${entry.missed}`, `last ${timeText(entry.last)}`];
  if (entry.due > 0) parts.push(`level ${entry.level}`, `review ${timeText(entry.due)}`);
  // Last, as a name may hold any word: a chapter is named by the family only.
  if (entry.name) parts.push(`opening ${entry.name}`);
  return `${MARK} ${parts.join(' · ')}`;
}

/** The user's own words in a comment, and ours after them. */
function splitComment(comment: string): { own: string; data: string } {
  const at = comment.indexOf(MARK);
  if (at < 0) return { own: comment, data: '' };
  return { own: comment.slice(0, at).trim(), data: comment.slice(at) };
}

/** The comment without our record: the user's own words. */
export const ownWords = (comment: string): string => splitComment(comment).own;

type Kept = Pick<Entry, 'seen' | 'missed' | 'level' | 'due' | 'last'> & {
  readonly name: string | null;
};

const countIn = (data: string, word: string): number | null => {
  const found = new RegExp(`\\b${word} (\\d+)`).exec(data)?.[1];
  return found === undefined ? null : Number(found);
};

const timeIn = (data: string, word: string): number | null => {
  const found = new RegExp(`\\b${word} (\\d{4}-\\d\\d-\\d\\d) (\\d\\d:\\d\\d) UTC`).exec(data);
  if (!found) return null;
  const ms = Date.parse(`${found[1]}T${found[2]}Z`);
  return Number.isNaN(ms) ? null : ms;
};

/** The record a comment of ours holds; null for another's. */
export function readRecord(comment: string): Kept | null {
  const { data } = splitComment(comment);
  const seen = countIn(data, 'seen');
  const missed = countIn(data, 'missed');
  const last = timeIn(data, 'last');
  if (seen === null || missed === null || last === null) return null;
  return {
    seen,
    missed,
    last,
    level: countIn(data, 'level') ?? 0,
    due: timeIn(data, 'review') ?? 0,
    name: /\bopening (.+)$/.exec(data)?.[1]?.trim() ?? null,
  };
}

const turnAt = (moves: readonly string[]): Color => (moves.length % 2 === 0 ? 'white' : 'black');

/** The positions of `side` a chapter's tree records, in the opening `name` unless they name theirs. */
export function treeEntries(tree: PgnTree, side: Color, name: string): Entry[] {
  const entries: Entry[] = [];
  const walk = (node: PgnTree, moves: string[]): void => {
    const record = turnAt(moves) === side ? readRecord(node.comment) : null;
    if (record)
      entries.push({
        ...record,
        side,
        moves,
        name: record.name ?? name,
        answers: node.children.map(each => each.san),
      });
    for (const child of node.children) walk(child, [...moves, child.san]);
  };
  walk(tree, []);
  return entries;
}

function childOf(node: PgnTree, san: string): PgnTree {
  const found = node.children.find(each => each.san === san);
  if (found) return found;
  const made = { san, comment: '', children: [] };
  node.children.push(made);
  return made;
}

/**
 * The chapter's tree with `entries` written into it: their lines and the moves
 * found added, their comments ours again. The moves and words the user added
 * in the study stay. The most played come first, as a new line's main line.
 */
export function withEntries(tree: PgnTree | null, entries: readonly Entry[]): PgnTree {
  const root: PgnTree = tree ? structuredClone(tree) : { comment: '', children: [] };
  for (const entry of entries.toSorted((first, second) => second.seen - first.seen)) {
    const node = entry.moves.reduce(childOf, root);
    for (const answer of entry.answers) childOf(node, answer);
    // The repertoire's move is the study's main line: the first.
    const rank = (child: PgnNode): number => {
      const at = entry.answers.indexOf(child.san);
      return at < 0 ? entry.answers.length : at;
    };
    node.children.sort((first, second) => rank(first) - rank(second));
    const { own } = splitComment(node.comment);
    node.comment = [own, dataComment(entry)].filter(Boolean).join(' ');
  }
  return root;
}

/** How the user knows a line: the positions met past it, the moves played and missed there. */
export function lineRecord(
  entries: readonly Entry[],
  side: Color,
  moves: readonly string[],
): { positions: number; seen: number; missed: number } {
  const own = entries.filter(entry => entry.side === side && goesThrough(entry.moves, moves));
  return {
    positions: own.length,
    seen: own.reduce((sum, entry) => sum + entry.seen, 0),
    missed: own.reduce((sum, entry) => sum + entry.missed, 0),
  };
}
