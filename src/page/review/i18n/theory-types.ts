import type { Ways } from './types.ts';

/** What the coach says of opening theory (theory/book.ts). */
export interface TheorySentences {
  /** The study the theory is read from, in this language; null while it has none. */
  readonly study: string | null;
  /** Under the explanation: the moves theory goes on with, as tokens. */
  readonly next: (moves: readonly string[]) => Ways;
  /** Before the comment on a move that leaves the book: what theory plays there instead. */
  readonly left: (moves: readonly string[]) => Ways;
  /** Under a mistake the books explain: the moves that punish it, as tokens. */
  readonly punish: (moves: readonly string[]) => Ways;
  /** After an error many players make there: the share of the mover's level (`rated`) or of club players. */
  readonly common: (share: number, rated: boolean) => Ways;
}
