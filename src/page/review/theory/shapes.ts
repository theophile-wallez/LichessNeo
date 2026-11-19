import type { Mark, MarkTone } from '#shared/board/marks.ts';
import { parseSquare } from '#shared/chess/squares.ts';

// The shapes a study comment draws, as Lichess writes them in its export:
// [%csl Ge4,Rd5] rings squares, [%cal Ge2e4] draws arrows, each led by its
// brush's letter. The coach draws them as its own marks, in the tone nearest
// the brush's color: Lichess has a blue brush, the coach has none.

const TONES: Readonly<Record<string, MarkTone>> = {
  G: 'defense',
  R: 'attack',
  Y: 'plan',
  B: 'plan',
};

const COMMAND = /\[%(csl|cal)\s+([^\]]*)\]/g;
const SHAPE = /^([GRYB])([a-h][1-8])([a-h][1-8])?$/;

/** A shape of a comment's command, or null for one the coach can't draw. */
function markOf(command: string, shape: string): Mark | null {
  const [, brush = '', first = '', second] = SHAPE.exec(shape) ?? [];
  const tone = TONES[brush];
  const from = parseSquare(first);
  if (!tone || !from) return null;
  if (command === 'csl') return second ? null : { kind: 'ring', square: from, tone };
  const to = parseSquare(second ?? '');
  if (!to || to === from) return null;
  return { kind: 'link', from, to, tone };
}

export interface CommentShapes {
  /** The comment without its commands. */
  readonly text: string;
  readonly marks: readonly Mark[];
}

/** A comment's text and the shapes its commands draw. */
export function commentShapes(comment: string): CommentShapes {
  const marks: Mark[] = [];
  const text = comment.replaceAll(COMMAND, (_whole, command: string, shapes: string) => {
    for (const shape of shapes.split(',')) {
      const mark = markOf(command, shape.trim());
      if (mark) marks.push(mark);
    }
    return '';
  });
  return { text: text.replaceAll(/\s{2,}/g, ' ').trim(), marks };
}
