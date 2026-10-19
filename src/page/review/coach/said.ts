import type { Ways } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { hash } from './hash.ts';

// A fact the coach states, and the tactic it's about.

/** The tactic a fact is about, which the bubble names on a tag. */
export type Theme =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'doubleCheck'
  | 'defender'
  | 'trapped'
  | 'hanging'
  | 'mate'
  | 'sacrifice';

export interface Fact {
  readonly text: string;
  readonly theme: Theme | null;
}

export const said = (text: string, theme: Theme | null = null): Fact => ({ text, theme });

/** One of the ways to say a fact, picked by `seed`: the same each time it's shown. */
export const pickBy = (ways: Ways, seed: string): string =>
  ways[hash(seed) % ways.length] ?? ways[0];

/** One of the ways to say a fact, picked by its move: the same each time the move is shown. */
export const oneOf = (ways: Ways, move: MoveVerdict): string =>
  pickBy(ways, `${move.previousPosition.fen}|${move.uci}`);
