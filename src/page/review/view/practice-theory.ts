import { parentPath } from '#page/lichess/tree.ts';
import type { Miss } from '#page/review/practice/state.ts';
import { bookBefore } from '#page/review/practice/state.ts';
import { theoryAt } from '#page/review/theory/book.ts';
import type { Spoken } from './practice-spoken.ts';

// What the coach's opening theory adds to practice's words: why a refused
// move is a known mistake, and at the line's end what its position is about.
// The move to find stays the user's to find: a mistake's text that names one
// of them is left unsaid.

const bare = (san: string): string => san.replace(/[+#]$/, '');

// A move chip of the coach's text, numbered or not: [[m:w:Nf3…]], [[n:3.:w:Nf3…]].
const MOVE_TOKEN = /\[\[(?:m|n:[^:\]]+):[wb]:([^@\]]+)/g;

/** The moves a text of the coach's names, bare. */
export const namedMoves = (text: string): ReadonlySet<string> =>
  new Set(Array.from(text.matchAll(MOVE_TOKEN), ([, san = '']) => bare(san)));

/** The moves the user is to find where `miss` was played: the book's and theory's. */
function movesToFind({ practice, analysis }: Spoken, miss: Miss): ReadonlySet<string> {
  const { path } = miss.played;
  const before = theoryAt(analysis.nodeAtPath(parentPath(path)).fen);
  const book = bookBefore(practice, analysis, path);
  return new Set([...(before?.next ?? []), ...(book?.moves ?? [])].map(({ san }) => bare(san)));
}

/** Why the refused move is a mistake theory knows, unless that says what to play instead. */
export function theoryMissWords(spoken: Spoken, miss: Miss): string | null {
  const entry = theoryAt(spoken.analysis.nodeAtPath(miss.played.path).fen);
  if (!entry?.mistake) return null;
  const toFind = movesToFind(spoken, miss);
  const named = namedMoves(entry.text);
  return [...named].some(san => toFind.has(san)) ? null : entry.text;
}

/** At the line's end, what theory says of its position: there is nothing left to find. */
export function theoryEndWords({ analysis }: Spoken): string | null {
  const entry = theoryAt(analysis.node.fen);
  return entry && !entry.mistake ? entry.text : null;
}
