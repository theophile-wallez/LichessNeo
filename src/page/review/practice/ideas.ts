import type { Color } from '#shared/chess/types.ts';
import { chapterOf } from './chapters.ts';
import { IDEA_SIDES } from './idea-sides.ts';

// The idea of the opening a line has reached: its own, else its family's, with
// the side whose plan it gives.

export interface Idea {
  readonly text: string;
  readonly side: Color;
}

/** The idea of the opening `name`, in `ideas`' language: its own, else its family's. */
export function ideaOf(ideas: Readonly<Record<string, string>>, name: string): Idea | null {
  for (const key of [name, chapterOf(name)]) {
    const text = ideas[key];
    const side = IDEA_SIDES[key];
    if (text && side) return { text, side };
  }
  return null;
}
