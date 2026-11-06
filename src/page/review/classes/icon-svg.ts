import { coachOptions } from '#shared/coach.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { onCoachOptions } from '#shared/protocol.ts';
import { CLASS_COLORS, type MoveClass } from './classes.ts';
import { CLASS_GLYPHS, DOT_GLYPHS, type GlyphPath } from './glyphs.ts';

// A class's icon: a rounded square tinted with its color, under its glyph in
// that color. The square's fill is the first in the markup, which the review's
// test snapshots read as its color. The good tiers are dots instead when the
// coach's settings say so (#shared/coach.ts).

// A Hugeicon's 24-unit grid, 15 units across in the middle of the box, its
// stroke as thick as the annotation symbols'.
const ICON_SCALE = 0.625;
const ICON_OFFSET = 10 - 12 * ICON_SCALE;
const iconPlace = (lift: number): string =>
  `translate(${ICON_OFFSET} ${ICON_OFFSET - lift * ICON_SCALE}) scale(${ICON_SCALE})`;
const ICON_STROKE = 2 / ICON_SCALE;

function pathMarkup({ path, solid, icon, lift = 0 }: GlyphPath, color: string): SafeHtml {
  if (icon)
    return html`<path fill="${solid ? color : 'none'}" transform="${iconPlace(lift)}" stroke-width="${ICON_STROKE}" d="${path}"/>`;
  return solid
    ? html`<path fill="${color}" stroke="none" d="${path}"/>`
    : html`<path d="${path}"/>`;
}

function buildSvg(moveClass: MoveClass, dots: boolean): SafeHtml {
  const color = CLASS_COLORS[moveClass];
  const glyph = (dots ? DOT_GLYPHS[moveClass] : undefined) ?? CLASS_GLYPHS[moveClass];
  const paths = glyph.map(path => pathMarkup(path, color));
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" rx="5" fill="${color}" fill-opacity="0.18"/><g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

const svgCache = new Map<MoveClass, SafeHtml>();
// Read on first use, as the content script kept it.
let dotsDrawn: boolean | null = null;

function drawsDots(): boolean {
  dotsDrawn ??= coachOptions().dots;
  return dotsDrawn;
}

/** The icon as inline SVG markup. */
export function classSvg(moveClass: MoveClass): SafeHtml {
  let svg = svgCache.get(moveClass);
  if (!svg) {
    svg = buildSvg(moveClass, drawsDots());
    svgCache.set(moveClass, svg);
  }
  return svg;
}

/** Calls `redraw` when the settings switch between icons and dots, once the icons follow. */
export function followClassDots(redraw: () => void): () => void {
  return onCoachOptions(({ dots }) => {
    if (dots === drawsDots()) return;
    dotsDrawn = dots;
    svgCache.clear();
    redraw();
  });
}

/** The icon as a CSS image (`--ln-ext-class-icon` on the move list's moves, the opening's name). */
export const classImage = (moveClass: MoveClass): string =>
  `url("data:image/svg+xml,${encodeURIComponent(classSvg(moveClass).value)}")`;

/** The icon in its wrapper, as the panel shows it. */
export const classIcon = (moveClass: MoveClass): SafeHtml =>
  html`<span class="ln-ext-cls-icon">${classSvg(moveClass)}</span>`;
