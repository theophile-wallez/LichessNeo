import type { Mark } from '#page/board/review-arrows.ts';
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
  /** What the fact speaks of, drawn on the board. */
  readonly drawing?: readonly Mark[];
  /** The technical side of it, the moves and squares, said below the rest. */
  readonly detail?: string;
}

export const said = (
  text: string,
  theme: Theme | null = null,
  drawing: readonly Mark[] | null = null,
): Fact => (drawing && drawing.length > 0 ? { text, theme, drawing } : { text, theme });

/** `fact`, its technical side said below the rest. */
export const withDetail = (fact: Fact, detail: string): Fact => ({ ...fact, detail });

/** One of the ways to say a fact, picked by `seed`: the same each time it's shown. */
export const pickBy = (ways: Ways, seed: string): string =>
  ways[hash(seed) % ways.length] ?? ways[0];

/**
 * A move's step in the turn order, for picks that mustn't repeat from one move
 * to the next: each side's next move steps on by one, and the other side's
 * stand two further, so any three moves in a row pick apart from three ways.
 */
export const turnStep = ({ ply, color }: MoveVerdict): number =>
  Math.ceil(ply / 2) + (color === 'black' ? 2 : 0);

/**
 * One of the ways to say a fact, picked by its move: the same each time the
 * move is shown, and, from three ways, another than the two moves before it.
 */
export const oneOf = (ways: Ways, move: MoveVerdict): string =>
  ways.length < 3
    ? pickBy(ways, `${move.previousPosition.fen}|${move.uci}`)
    : (ways[turnStep(move) % ways.length] ?? ways[0]);
