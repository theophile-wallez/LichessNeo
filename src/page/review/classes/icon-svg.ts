import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from './classes.ts';
import { CLASS_GLYPHS } from './glyphs.ts';

// A class's icon: a rounded square tinted with its color, under its glyph in
// that color. The square's fill is the first in the markup, which the review's
// test snapshots read as its color.

function buildSvg(moveClass: MoveClass): SafeHtml {
  const color = CLASS_COLORS[moveClass];
  const paths = CLASS_GLYPHS[moveClass].map(({ path, solid }) =>
    solid ? html`<path fill="${color}" stroke="none" d="${path}"/>` : html`<path d="${path}"/>`,
  );
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" rx="5" fill="${color}" fill-opacity="0.18"/><g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

const svgCache = new Map<MoveClass, SafeHtml>();

/** The icon as inline SVG markup. */
export function classSvg(moveClass: MoveClass): SafeHtml {
  let svg = svgCache.get(moveClass);
  if (!svg) {
    svg = buildSvg(moveClass);
    svgCache.set(moveClass, svg);
  }
  return svg;
}

/** The icon as a CSS image (`--ln-ext-class-icon` on the move list's moves, the opening's name). */
export const classImage = (moveClass: MoveClass): string =>
  `url("data:image/svg+xml,${encodeURIComponent(classSvg(moveClass).value)}")`;

/** The icon in its wrapper, as the panel shows it. */
export const classIcon = (moveClass: MoveClass): SafeHtml =>
  html`<span class="ln-ext-cls-icon">${classSvg(moveClass)}</span>`;
