// How well an entry's words match what's typed, for the palette's order. Accents and case
// don't count, so "echiquier" finds "Échiquier".

export interface Ranked {
  readonly label: string;
  /** Other words that find it, weaker than its label: its section's name. */
  readonly keywords?: string;
}

export const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const WORD_START = /[\s/·-]+/;

/** 0 for no match, higher for a better one: the label's start, a word's, anywhere in it. */
export function matchScore(query: string, entry: Ranked): number {
  const typed = fold(query);
  if (!typed) return 1;
  const label = fold(entry.label);
  if (label.startsWith(typed)) return 4;
  if (label.split(WORD_START).some(word => word.startsWith(typed))) return 3;
  if (label.includes(typed)) return 2;
  return entry.keywords && fold(entry.keywords).includes(typed) ? 1 : 0;
}

/** The entries that match, the best first, in their own order between equals. */
export function rank<T extends Ranked>(entries: readonly T[], query: string): T[] {
  return entries
    .map((entry, index) => ({ entry, index, score: matchScore(query, entry) }))
    .filter(({ score }) => score > 0)
    .toSorted((first, second) => second.score - first.score || first.index - second.index)
    .map(({ entry }) => entry);
}
