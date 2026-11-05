import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import ThumbsUpIcon from '@hugeicons/core-free-icons/ThumbsUpIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import type { HugeIcon } from '#shared/hugeicons.ts';
import type { MoveClass } from './classes.ts';

// The class icons' glyphs, in the class's color over a tint of it, in a 20 x 20
// viewBox: the annotation symbols (!!, !, ?!, ?, ??) where chess has one,
// Hugeicons for the good tiers (a star, a thumb up, a tick: told apart at a
// glance), lines for the book and a slashed circle for a miss.

/**
 * One path of a glyph: its `d`, stroked, or filled when solid; `icon` when in
 * Hugeicons' 24-unit grid, raised by `lift` units of it.
 */
export interface GlyphPath {
  readonly path: string;
  readonly solid: boolean;
  readonly icon?: boolean;
  readonly lift?: number;
}

const stroke = (path: string): GlyphPath => ({ path, solid: false });

/** A Hugeicon's paths, in its own grid: the icon's markup scales them into the box. */
const iconPaths = (icon: HugeIcon, { solid = false, lift = 0 } = {}): GlyphPath[] =>
  icon.flatMap(([tag, { d }]) =>
    tag === 'path' && typeof d === 'string' ? [{ path: d, solid, icon: true, lift }] : [],
  );

// The star's box is centered, but its two wide feet put its weight lower: its
// centroid is 0.93 units below the middle, so it's raised by that to look centered.
const STAR_LIFT = 0.93;

const round = (value: number): number => Math.round(value * 100) / 100;

// A dot is a zero-length line: its round cap draws it.
const DOT_Y = 14.6;
const STEM_END = 11.4;

/** An exclamation mark centered on `x`. */
const exclamation = (x: number): GlyphPath => stroke(`M${x} 5V${STEM_END}M${x} ${DOT_Y}v0`);

/** A question mark centered on `x`, its hook of the given radius. */
function question(x: number, radius: number): GlyphPath {
  const centerY = round(5 + radius);
  const diagonal = round(radius * Math.SQRT1_2);
  const hookEnd = { x: round(x + diagonal), y: round(centerY + diagonal) };
  const stemTop = round(centerY + radius + 0.6);
  return stroke(
    `M${round(x - radius)} ${centerY}A${radius} ${radius} 0 1 1 ${hookEnd.x} ${hookEnd.y}` +
      `C${round(hookEnd.x - diagonal / 2)} ${round(hookEnd.y + diagonal / 2)} ${x} ${round(stemTop - 1)} ${x} ${stemTop}` +
      `V${STEM_END}M${x} ${DOT_Y}v0`,
  );
}

export const CLASS_GLYPHS: Readonly<Record<MoveClass, readonly GlyphPath[]>> = {
  brilliant: [exclamation(7.2), exclamation(12.8)],
  great: [exclamation(10)],
  book: [stroke('M5.6 6.4h8.8M5.6 10h8.8M5.6 13.6h8.8')],
  best: iconPaths(StarIcon, { solid: true, lift: STAR_LIFT }),
  excellent: iconPaths(ThumbsUpIcon),
  good: iconPaths(Tick02Icon),
  inaccuracy: [question(7.6, 2.3), exclamation(13.6)],
  mistake: [question(10, 2.3)],
  miss: [stroke('M14.4 10a4.4 4.4 0 1 1-8.8 0 4.4 4.4 0 1 1 8.8 0M6.9 13.1l6.2-6.2')],
  blunder: [question(6.8, 1.9), question(13.2, 1.9)],
};
