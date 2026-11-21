import SparkleIcon from '@hugeicons/core-free-icons/SparkleIcon';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { CLASS_COLORS } from '#page/review/classes/classes.ts';

// A brilliant move's moment on the board: its square glows and sparks fly off
// it, under the badge, which pops (styles/review/burst.css). It plays once, when
// the overlay's markup is put in, so stepping onto the move again plays it
// again. The markup must not change between two renders of the same move, or it
// would play on every tick: nothing in it is random.

const SQUARE = 12.5;
const SPARKS = 12;
// A spark's width, in % of the board; the CSS sizes it the same.
const SPARK_SIZE = 4.2;
// How far the sparks fly, in squares: every other one goes the far way.
const NEAR = 1.4;
const FAR = 2.3;

const round = (value: number): number => Math.round(value * 100) / 100;

function spark(i: number): SafeHtml {
  const angle = (i / SPARKS) * 2 * Math.PI + (i % 2 === 0 ? 0 : 0.3);
  // In spark widths, which `translate`'s percentages count in.
  const reach = ((i % 2 === 0 ? FAR : NEAR) * SQUARE) / SPARK_SIZE;
  const dx = round(Math.cos(angle) * reach * 100);
  const dy = round(Math.sin(angle) * reach * 100);
  return html`<span class="ln-ext-burst__spark" style="--ln-ext-burst-dx:${dx}%;--ln-ext-burst-dy:${dy}%;--ln-ext-burst-i:${i}">${hugeicon(SparkleIcon)}</span>`;
}

/** The moment on the landing square's column and row, or nothing off the board (no square to land on). */
export function burstMarkup([column, row]: Point): SafeHtml | null {
  if (!Number.isFinite(row) || column < 0 || column > 7) return null;
  const style = `--ln-ext-burst-x:${column * SQUARE}%;--ln-ext-burst-y:${row * SQUARE}%;--ln-ext-burst-c:${CLASS_COLORS.brilliant}`;
  const sparks = Array.from({ length: SPARKS }, (_, i) => spark(i));
  return html`<div class="ln-ext-burst" style="${style}"><span class="ln-ext-burst__glow"></span>${sparks}</div>`;
}
