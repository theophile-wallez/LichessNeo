import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from './classes.ts';
import { CLASS_GLYPHS } from './glyphs.ts';

// A class's icon: a disc in its color under a white glyph. The disc's fill is
// the first in the markup, which the review's test snapshots read as its color.

function buildSvg(moveClass: MoveClass): SafeHtml {
  const paths = CLASS_GLYPHS[moveClass].map(({ path, solid }) =>
    solid ? html`<path fill="#fff" stroke-width="1" d="${path}"/>` : html`<path d="${path}"/>`,
  );
  return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="${CLASS_COLORS[moveClass]}"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
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

/** The icon as a CSS image (`--lr-ext-class-icon` on the move list's moves, the opening's name). */
export const classImage = (moveClass: MoveClass): string =>
  `url("data:image/svg+xml,${encodeURIComponent(classSvg(moveClass).value)}")`;

/** The icon in its wrapper, as the panel shows it. */
export const classIcon = (moveClass: MoveClass): SafeHtml =>
  html`<span class="lr-ext-cls-icon">${classSvg(moveClass)}</span>`;
