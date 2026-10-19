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
